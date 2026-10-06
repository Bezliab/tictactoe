/**
 * online.js
 * Peer-to-peer online multiplayer (WebRTC via PeerJS).
 *
 * One player "hosts" and gets a random 8-digit code. The other player types
 * that code to join. After the handshake the two browsers talk directly to
 * each other; the public PeerJS server is only used for matchmaking.
 *
 * Public API (window.Online):
 *   host(callbacks)          -> start a room, callbacks.onCode(code) fires when ready
 *   join(code, callbacks)    -> join a room by its 8-digit code
 *   send(message)            -> send a plain object to the opponent
 *   leave()                  -> tell the opponent we're leaving and tear down
 *   isConnected()            -> boolean
 *
 * callbacks: { onCode, onConnected, onMessage, onDisconnected, onError }
 */

const Online = (() => {
  /* Namespace so our IDs can't collide with other apps on the shared server. */
  const ID_PREFIX = "bezliab-ttt-";
  const CODE_LENGTH = 8;
  const MAX_ID_RETRIES = 6;
  const JOIN_TIMEOUT_MS = 15000;
  const PING_EVERY_MS = 4000;
  const SILENCE_LIMIT_MS = 13000;

  /*
   * ICE servers. STUN alone connects most players; some strict networks
   * (mobile carriers with symmetric NAT, corporate Wi-Fi) also need a TURN
   * relay. To add one, push an entry here, e.g.
   *   { urls: "turn:your.turn.host:3478", username: "...", credential: "..." }
   */
  const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  let peer = null;
  let conn = null;
  let cb = {};
  let pingTimer = null;
  let watchdog = null;
  let joinTimer = null;
  let lastHeard = 0;
  let closedByUs = false;
  let session = 0; // bumps on every host/join/leave so stale events are ignored

  /* ── Helpers ─────────────────────────────────────────────── */
  function generateCode() {
    // Uniform 8-digit number, 10000000-99999999 (no leading zero, so it is
    // always exactly 8 digits when typed or read aloud).
    const min = 10 ** (CODE_LENGTH - 1);
    const span = 9 * min;
    const buf = new Uint32Array(1);
    // Rejection sampling avoids modulo bias.
    const limit = Math.floor(0x100000000 / span) * span;
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return String(min + (buf[0] % span));
  }

  function normalizeCode(raw) {
    return String(raw || "").replace(/\D/g, "");
  }

  function isValidCode(code) {
    return new RegExp(`^[1-9]\\d{${CODE_LENGTH - 1}}$`).test(code);
  }

  function peerOptions() {
    return { debug: 0, config: { iceServers: ICE_SERVERS } };
  }

  function libraryMissing() {
    return typeof window.Peer !== "function";
  }

  /* Stop timers and forget the current connection WITHOUT closing it. */
  function release() {
    session += 1;
    clearInterval(pingTimer);
    clearInterval(watchdog);
    clearTimeout(joinTimer);
    pingTimer = watchdog = joinTimer = null;
    const old = { conn, peer };
    conn = null;
    peer = null;
    return old;
  }

  function closeNow(old) {
    try {
      old.conn && old.conn.close();
    } catch (e) {}
    try {
      old.peer && old.peer.destroy();
    } catch (e) {}
  }

  function teardown() {
    closeNow(release());
  }

  /* ── Connection wiring (shared by host and guest) ────────── */
  function attachConnection(connection, mySession, role) {
    conn = connection;
    lastHeard = Date.now();
    let welcomed = role === "host"; // guests wait for the host's "welcome"

    conn.on("data", (data) => {
      if (mySession !== session) return;
      lastHeard = Date.now();
      if (!data || typeof data !== "object" || typeof data.t !== "string") {
        return;
      }
      if (data.t === "ping") return; // keep-alive only
      if (role === "guest" && !welcomed) {
        if (data.t === "welcome") {
          welcomed = true;
          clearTimeout(joinTimer);
          cb.onConnected && cb.onConnected();
        } else if (data.t === "full") {
          fail("That game already has two players.", mySession);
        }
        return;
      }
      if (data.t === "bye") {
        handleDisconnect(mySession, "left");
        return;
      }
      cb.onMessage && cb.onMessage(data);
    });

    conn.on("close", () => handleDisconnect(mySession, "closed"));
    conn.on("error", () => handleDisconnect(mySession, "error"));

    clearInterval(pingTimer);
    clearInterval(watchdog);
    pingTimer = setInterval(() => send({ t: "ping" }), PING_EVERY_MS);
    watchdog = setInterval(() => {
      if (Date.now() - lastHeard > SILENCE_LIMIT_MS) {
        handleDisconnect(mySession, "timeout");
      }
    }, 2000);
  }

  function handleDisconnect(mySession, reason) {
    if (mySession !== session || closedByUs) return;
    const callbacks = cb;
    teardown();
    callbacks.onDisconnected && callbacks.onDisconnected(reason);
  }

  function fail(message, mySession) {
    if (mySession !== session) return;
    const callbacks = cb;
    teardown();
    callbacks.onError && callbacks.onError(message);
  }

  /* ── Host ────────────────────────────────────────────────── */
  function host(callbacks) {
    teardown();
    closedByUs = false;
    cb = callbacks || {};
    const mySession = session;

    if (libraryMissing()) {
      fail("Online play couldn't load. Check your connection and reload.", mySession);
      return;
    }

    let attempts = 0;

    const open = () => {
      const code = generateCode();
      const p = new window.Peer(ID_PREFIX + code, peerOptions());
      peer = p;

      p.on("open", () => {
        if (mySession !== session) return;
        cb.onCode && cb.onCode(code);
      });

      p.on("connection", (incoming) => {
        if (mySession !== session) return;
        // Room is for exactly two players: turn away anyone else.
        incoming.on("open", () => {
          if (mySession !== session) return;
          if (conn) {
            try {
              incoming.send({ t: "full" });
            } catch (e) {}
            setTimeout(() => incoming.close(), 300);
            return;
          }
          attachConnection(incoming, mySession, "host");
          send({ t: "welcome" });
          cb.onConnected && cb.onConnected();
        });
      });

      p.on("error", (err) => {
        if (mySession !== session || p !== peer) return;
        if (err.type === "unavailable-id" && attempts < MAX_ID_RETRIES) {
          // Someone else already holds this code: pick another.
          attempts += 1;
          try {
            p.destroy();
          } catch (e) {}
          open();
          return;
        }
        fail(describeError(err), mySession);
      });

      p.on("disconnected", () => {
        // Lost the matchmaking server. Fine once the game is connected
        // (we talk directly); before that, try to get back online.
        if (mySession !== session || conn) return;
        try {
          p.reconnect();
        } catch (e) {}
      });
    };

    open();
  }

  /* ── Join ────────────────────────────────────────────────── */
  function join(rawCode, callbacks) {
    teardown();
    closedByUs = false;
    cb = callbacks || {};
    const mySession = session;
    const code = normalizeCode(rawCode);

    if (!isValidCode(code)) {
      fail(`Enter the full ${CODE_LENGTH}-digit code.`, mySession);
      return;
    }
    if (libraryMissing()) {
      fail("Online play couldn't load. Check your connection and reload.", mySession);
      return;
    }

    const p = new window.Peer(peerOptions());
    peer = p;

    p.on("open", () => {
      if (mySession !== session) return;
      const connection = p.connect(ID_PREFIX + code, {
        reliable: true,
        serialization: "json",
      });

      joinTimer = setTimeout(() => {
        fail(
          "Couldn't connect. Check the code, or try again (some networks block direct connections).",
          mySession,
        );
      }, JOIN_TIMEOUT_MS);

      connection.on("open", () => {
        if (mySession !== session) return;
        // Connected to the room; we're "in" once the host sends "welcome".
        attachConnection(connection, mySession, "guest");
      });
      connection.on("error", () =>
        fail("Couldn't connect to that game.", mySession),
      );
    });

    p.on("error", (err) => {
      if (mySession !== session || p !== peer) return;
      fail(describeError(err), mySession);
    });
  }

  function describeError(err) {
    switch (err && err.type) {
      case "peer-unavailable":
        return "No game found with that code. Check it and try again.";
      case "network":
      case "server-error":
      case "socket-error":
      case "socket-closed":
        return "Can't reach the matchmaking server. Check your internet connection.";
      case "browser-incompatible":
        return "This browser doesn't support online play.";
      case "unavailable-id":
        return "Couldn't create a game. Please try again.";
      default:
        return "Something went wrong with the connection. Please try again.";
    }
  }

  /* ── Messaging ───────────────────────────────────────────── */
  function send(message) {
    if (conn && conn.open) {
      try {
        conn.send(message);
      } catch (e) {}
    }
  }

  function leave() {
    closedByUs = true;
    send({ t: "bye" });
    const old = release();
    cb = {};
    // Give the "bye" a moment to flush before closing the channel.
    setTimeout(() => closeNow(old), 150);
  }

  function isConnected() {
    return !!(conn && conn.open);
  }

  return { host, join, send, leave, isConnected, CODE_LENGTH };
})();

window.Online = Online;
