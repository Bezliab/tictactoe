/**
 * game.js
 * Main game controller: UI, state, turns, win detection.
 */

(() => {
  const DEFAULT_LEVEL_KEY = "easy";

  /* ── State ─────────────────────────────────────────────── */
  const state = {
    mode: null,
    difficulty: DEFAULT_LEVEL_KEY,
    board: Array(9).fill(null),
    currentPlayer: "X",
    scores: { X: 0, O: 0, draw: 0 },
    gameOver: false,
    isThinking: false,
    // Who opens the current round. Alternates after every finished round in
    // Player vs Player and online games so neither side always goes first.
    starter: "X",
    // Online match info (null when not playing online):
    // { role, mySymbol, connected, meReady, oppReady }
    online: null,
  };

  const RESTART_HTML = '<i class="fa-solid fa-rotate-left"></i> Play again';
  const other = (mark) => (mark === "X" ? "O" : "X");
  const isOnline = () => state.mode === "online" && state.online !== null;

  /* ── DOM ────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const el = {
    homeScreen: $("homeScreen"),
    gameScreen: $("gameScreen"),
    themeToggle: $("themeToggle"),
    themeIcon: $("themeIcon"),
    pvpBtn: $("pvpBtn"),
    pvcBtn: $("pvcBtn"),
    onlineBtn: $("onlineBtn"),
    onlineSection: $("onlineSection"),
    onlineChoice: $("onlineChoice"),
    onlineHost: $("onlineHost"),
    onlineJoining: $("onlineJoining"),
    onlineStatus: $("onlineStatus"),
    onlineCancelBtn: $("onlineCancelBtn"),
    createRoomBtn: $("createRoomBtn"),
    joinRoomBtn: $("joinRoomBtn"),
    joinCodeInput: $("joinCodeInput"),
    codeDisplay: $("codeDisplay"),
    copyCodeBtn: $("copyCodeBtn"),
    diffSection: $("difficultySection"),
    diffButtons: $("diffButtons"),
    startBtn: $("startBtn"),
    backBtn: $("backBtn"),
    gameModeLabel: $("gameModeLabel"),
    nameX: $("nameX"),
    nameO: $("nameO"),
    scoreX: $("scoreValueX"),
    scoreO: $("scoreValueO"),
    scoreDraw: $("scoreValueDraw"),
    scoreCardX: $("scoreX"),
    scoreCardO: $("scoreO"),
    turnText: $("turnText"),
    turnBadge: $("turnBadge"),
    board: $("board"),
    cells: document.querySelectorAll(".cell"),
    winLine: $("winLine"),
    resultBanner: $("resultBanner"),
    resultIcon: $("resultIcon"),
    resultText: $("resultText"),
    restartBtn: $("restartBtn"),
    newMatchBtn: $("newMatchBtn"),
  };

  const availableLevels = Array.isArray(window.GAME_LEVELS)
    ? window.GAME_LEVELS
    : [];

  /* ── Init ───────────────────────────────────────────────── */
  renderDifficultyButtons();

  let theme = localStorage.getItem("ttt-theme") || "dark";
  applyTheme(theme);

  /* ── Theme ──────────────────────────────────────────────── */
  el.themeToggle.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    localStorage.setItem("ttt-theme", theme);
    Sounds.click();
  });

  function applyTheme(nextTheme) {
    document.documentElement.setAttribute("data-theme", nextTheme);
    el.themeIcon.innerHTML =
      nextTheme === "dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
  }

  /* ── Home Screen ────────────────────────────────────────── */
  el.pvpBtn.addEventListener("click", () => {
    selectMode("pvp");
    Sounds.click();
  });

  el.pvcBtn.addEventListener("click", () => {
    selectMode("pvc");
    Sounds.click();
  });

  el.onlineBtn.addEventListener("click", () => {
    selectMode("online");
    Sounds.click();
  });

  function selectMode(mode) {
    if (state.mode === "online" && mode === "online") return;
    // Leaving the online lobby cancels any room that is waiting for a friend.
    if (state.mode === "online" && mode !== "online") cancelOnlineLobby();

    state.mode = mode;
    el.pvpBtn.classList.toggle("selected", mode === "pvp");
    el.pvcBtn.classList.toggle("selected", mode === "pvc");
    el.onlineBtn.classList.toggle("selected", mode === "online");
    el.diffSection.classList.toggle("hidden", mode !== "pvc");
    el.onlineSection.classList.toggle("hidden", mode !== "online");
    // Online games start from the lobby, not the Start button.
    el.startBtn.classList.toggle("hidden", mode === "online");
  }

  function renderDifficultyButtons() {
    if (!el.diffButtons || !availableLevels.length) return;

    el.diffButtons.innerHTML = availableLevels
      .map(
        (level) => `
      <button
        class="diff-btn ${level.key === state.difficulty ? "active" : ""}"
        data-diff="${level.key}"
        title="${level.description}"
        type="button"
      >
        ${level.label}
      </button>
    `,
      )
      .join("");

    el.diffButtons.querySelectorAll(".diff-btn").forEach((button) => {
      button.addEventListener("click", () => {
        setDifficulty(button.dataset.diff);
        Sounds.click();
      });
    });
  }

  function setDifficulty(levelKey) {
    state.difficulty = levelKey;
    el.diffButtons.querySelectorAll(".diff-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.diff === levelKey);
    });
  }

  function getSelectedLevel() {
    return window.getGameLevel
      ? window.getGameLevel(state.difficulty)
      : availableLevels[0];
  }

  el.startBtn.addEventListener("click", () => {
    if (!state.mode) return;
    Sounds.click();
    startGame();
  });

  /* ── Game Start ─────────────────────────────────────────── */
  function startGame() {
    state.scores = { X: 0, O: 0, draw: 0 };
    state.starter = "X";
    updateScoreDisplay();

    if (state.mode === "pvp") {
      el.nameX.textContent = "Player 1";
      el.nameO.textContent = "Player 2";
      el.gameModeLabel.textContent = "Player vs Player";
    } else {
      const level = getSelectedLevel();
      el.nameX.textContent = "You";
      el.nameO.textContent = level.aiLabel;
      el.gameModeLabel.textContent = `vs Computer · ${level.label}`;
    }

    switchScreen("game");
    resetRound();
  }

  /* ── Back to Home ───────────────────────────────────────── */
  el.backBtn.addEventListener("click", () => {
    Sounds.click();
    if (isOnline() && !confirmLeaveOnline()) return;
    leaveOnlineMatch();
    switchScreen("home");
  });

  function switchScreen(name) {
    el.homeScreen.classList.toggle("active", name === "home");
    el.gameScreen.classList.toggle("active", name === "game");
  }

  /* ── Round Reset ────────────────────────────────────────── */
  function resetRound() {
    state.board = Array(9).fill(null);
    state.currentPlayer = state.mode === "pvc" ? "X" : state.starter;
    state.gameOver = false;
    state.isThinking = false;

    el.cells.forEach((cell) => {
      cell.textContent = "";
      cell.className = "cell";
    });

    el.winLine.classList.remove("visible");
    el.winLine.setAttribute("x1", 0);
    el.winLine.setAttribute("y1", 0);
    el.winLine.setAttribute("x2", 0);
    el.winLine.setAttribute("y2", 0);

    el.resultBanner.classList.add("hidden");
    el.board.classList.remove("thinking");

    updateTurnIndicator();
    updateReplayButton();
  }

  /* ── Cell Click ─────────────────────────────────────────── */
  el.cells.forEach((cell) => {
    cell.addEventListener("click", () =>
      handleCellClick(Number(cell.dataset.index)),
    );
  });

  function handleCellClick(index) {
    if (state.gameOver || state.isThinking) return;
    if (state.board[index] !== null) return;
    if (state.mode === "pvc" && state.currentPlayer === "O") return;

    if (isOnline()) {
      const { connected, mySymbol } = state.online;
      if (!connected || state.currentPlayer !== mySymbol) return;
      placeMove(index, mySymbol);
      Online.send({ t: "move", i: index });
      return;
    }

    placeMove(index, state.currentPlayer);
  }

  function placeMove(index, player) {
    state.board[index] = player;
    const cell = el.cells[index];
    cell.textContent = player;
    cell.classList.add("taken", player.toLowerCase(), "pop");

    player === "X" ? Sounds.placeX() : Sounds.placeO();

    const result = checkGameEnd();
    if (!result) {
      state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
      updateTurnIndicator();

      if (state.mode === "pvc" && state.currentPlayer === "O") {
        triggerAIMove();
      }
    }
  }

  /* ── AI Move ────────────────────────────────────────────── */
  function triggerAIMove() {
    state.isThinking = true;
    el.board.classList.add("thinking");

    const level = getSelectedLevel();
    const delay = level.thinkingTime ?? 350;

    setTimeout(() => {
      const move = AI.getBestMove([...state.board], "O", state.difficulty);
      state.isThinking = false;
      el.board.classList.remove("thinking");
      if (move !== null) placeMove(move, "O");
    }, delay);
  }

  /* ── Win / Draw Check ───────────────────────────────────── */
  function checkGameEnd() {
    const winner = AI.checkWinner(state.board);
    if (winner) {
      const combo = AI.getWinningCombo(state.board);
      highlightWinner(combo);
      state.scores[winner] += 1;
      updateScoreDisplay(winner);
      showResult(getWinIcon(winner), getWinMessage(winner));
      if (isOnline() && winner !== state.online.mySymbol) Sounds.draw();
      else Sounds.win();
      state.gameOver = true;
      updateTurnIndicator();
      updateReplayButton();
      return true;
    }

    if (state.board.every((value) => value !== null)) {
      state.scores.draw += 1;
      updateScoreDisplay("draw");
      showResult("fa-solid fa-handshake", "It's a Draw!");
      Sounds.draw();
      state.gameOver = true;
      updateTurnIndicator();
      updateReplayButton();
      return true;
    }

    return false;
  }

  function getWinIcon(winner) {
    if (state.mode === "pvc") {
      return winner === "X" ? "fa-solid fa-trophy" : "fa-solid fa-robot";
    }
    if (isOnline()) {
      return winner === state.online.mySymbol
        ? "fa-solid fa-trophy"
        : "fa-solid fa-face-frown";
    }
    return "fa-solid fa-trophy";
  }

  function getWinMessage(winner) {
    if (isOnline()) {
      return winner === state.online.mySymbol ? "You Win!" : "Opponent Wins!";
    }
    if (state.mode === "pvp") {
      return winner === "X" ? "Player 1 Wins!" : "Player 2 Wins!";
    }
    return winner === "X" ? "You Win!" : "Computer Wins!";
  }

  /* ── Winning Line ───────────────────────────────────────── */
  const LINE_COORDS = {
    "012": { x1: 0.5, y1: 0.5, x2: 2.5, y2: 0.5 },
    345: { x1: 0.5, y1: 1.5, x2: 2.5, y2: 1.5 },
    678: { x1: 0.5, y1: 2.5, x2: 2.5, y2: 2.5 },
    "036": { x1: 0.5, y1: 0.5, x2: 0.5, y2: 2.5 },
    147: { x1: 1.5, y1: 0.5, x2: 1.5, y2: 2.5 },
    258: { x1: 2.5, y1: 0.5, x2: 2.5, y2: 2.5 },
    "048": { x1: 0.5, y1: 0.5, x2: 2.5, y2: 2.5 },
    246: { x1: 2.5, y1: 0.5, x2: 0.5, y2: 2.5 },
  };

  function highlightWinner(combo) {
    combo.forEach((index) => el.cells[index].classList.add("win-cell"));

    const key = [...combo].sort((a, b) => a - b).join("");
    const coords = LINE_COORDS[key];

    if (coords) {
      const { x1, y1, x2, y2 } = coords;
      el.winLine.setAttribute("x1", x1);
      el.winLine.setAttribute("y1", y1);
      el.winLine.setAttribute("x2", x2);
      el.winLine.setAttribute("y2", y2);
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      el.winLine.style.strokeDasharray = length;
      el.winLine.style.strokeDashoffset = length;
      el.winLine.classList.add("visible");
    }
  }

  /* ── Score Display ──────────────────────────────────────── */
  function updateScoreDisplay(bumped) {
    el.scoreX.textContent = state.scores.X;
    el.scoreO.textContent = state.scores.O;
    el.scoreDraw.textContent = state.scores.draw;

    if (bumped === "X") bump(el.scoreX);
    if (bumped === "O") bump(el.scoreO);
    if (bumped === "draw") bump(el.scoreDraw);
  }

  function bump(element) {
    element.classList.remove("score-bump");
    void element.offsetWidth;
    element.classList.add("score-bump");
  }

  /* ── Turn Indicator ─────────────────────────────────────── */
  function updateTurnIndicator() {
    const isX = state.currentPlayer === "X";
    const boardIsEmpty = state.board.every((value) => value === null);
    el.turnBadge.textContent = state.currentPlayer;
    el.turnBadge.className = `turn-badge ${isX ? "x-color" : "o-color"}`;

    if (isOnline()) {
      const { connected, mySymbol, oppReady } = state.online;
      const mine = state.currentPlayer === mySymbol;
      if (!connected) {
        el.turnText.textContent = "Match ended";
      } else if (state.gameOver && oppReady) {
        el.turnText.textContent = "Opponent wants to play again";
      } else if (boardIsEmpty && !state.gameOver) {
        el.turnText.textContent = mine ? "You start this round" : "Opponent starts this round";
      } else {
        el.turnText.textContent = mine ? "Your turn" : "Opponent's turn";
      }
      el.board.classList.toggle("not-your-turn", !mine || state.gameOver || !connected);
    } else if (state.mode === "pvp") {
      const name = isX ? "Player 1" : "Player 2";
      el.turnText.textContent = boardIsEmpty
        ? `${name} starts this round`
        : `${name}'s turn`;
      el.board.classList.remove("not-your-turn");
    } else {
      el.turnText.textContent = isX ? "Your turn" : "Computer thinking…";
      el.board.classList.remove("not-your-turn");
    }

    el.scoreCardX.classList.toggle("active-turn", isX);
    el.scoreCardO.classList.toggle("active-turn", !isX);
  }

  /* ── Result Banner ──────────────────────────────────────── */
  function showResult(icon, text) {
    el.resultIcon.innerHTML = `<i class="${icon}"></i>`;
    el.resultText.textContent = text;
    el.resultBanner.classList.remove("hidden");
  }

  /* ── Buttons ────────────────────────────────────────────── */
  el.restartBtn.addEventListener("click", () => {
    Sounds.click();

    if (isOnline()) {
      requestOnlineRematch();
      return;
    }

    // After a finished round the other player opens the next one.
    // Restarting a round that wasn't finished keeps the same opener.
    if (state.mode === "pvp" && state.gameOver) {
      state.starter = other(state.starter);
    }
    resetRound();
  });

  el.newMatchBtn.addEventListener("click", () => {
    Sounds.click();
    if (isOnline() && !confirmLeaveOnline()) return;
    leaveOnlineMatch();
    switchScreen("home");
    el.pvpBtn.classList.remove("selected");
    el.pvcBtn.classList.remove("selected");
    el.onlineBtn.classList.remove("selected");
    el.diffSection.classList.add("hidden");
    el.onlineSection.classList.add("hidden");
    el.startBtn.classList.add("hidden");
    state.mode = null;
    setDifficulty(DEFAULT_LEVEL_KEY);
  });

  /* ══════════════════════════════════════════════════════════
     ONLINE MULTIPLAYER
     ══════════════════════════════════════════════════════════ */

  /* ── Lobby ──────────────────────────────────────────────── */
  function showLobbyStep(step) {
    el.onlineChoice.classList.toggle("hidden", step !== "choice");
    el.onlineHost.classList.toggle("hidden", step !== "host");
    el.onlineJoining.classList.toggle("hidden", step !== "joining");
    el.onlineCancelBtn.classList.toggle("hidden", step === "choice");
  }

  function setOnlineStatus(message, isError = false) {
    el.onlineStatus.textContent = message || "";
    el.onlineStatus.classList.toggle("error", Boolean(isError));
  }

  function formatCode(code) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }

  function cancelOnlineLobby() {
    Online.leave();
    showLobbyStep("choice");
    setOnlineStatus("");
    el.copyCodeBtn.disabled = true;
    el.codeDisplay.textContent = "········";
  }

  const onlineCallbacks = {
    onCode(code) {
      el.codeDisplay.textContent = formatCode(code);
      el.codeDisplay.dataset.code = code;
      el.copyCodeBtn.disabled = false;
      setOnlineStatus("Waiting for your friend to join…");
    },
    onConnected() {
      startOnlineGame();
    },
    onMessage: handleOnlineMessage,
    onDisconnected: handleOnlineDisconnect,
    onError(message) {
      showLobbyStep("choice");
      el.copyCodeBtn.disabled = true;
      setOnlineStatus(message, true);
    },
  };

  el.createRoomBtn.addEventListener("click", () => {
    Sounds.click();
    el.copyCodeBtn.disabled = true;
    el.codeDisplay.textContent = "········";
    delete el.codeDisplay.dataset.code;
    showLobbyStep("host");
    setOnlineStatus("Creating your game…");
    state.pendingRole = "host";
    Online.host(onlineCallbacks);
  });

  function attemptJoin() {
    const code = el.joinCodeInput.value.replace(/\D/g, "");
    if (code.length !== Online.CODE_LENGTH) {
      setOnlineStatus(`Enter the full ${Online.CODE_LENGTH}-digit code.`, true);
      el.joinCodeInput.focus();
      return;
    }
    Sounds.click();
    showLobbyStep("joining");
    setOnlineStatus("Looking for that game…");
    state.pendingRole = "guest";
    Online.join(code, onlineCallbacks);
  }

  el.joinRoomBtn.addEventListener("click", attemptJoin);
  el.joinCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") attemptJoin();
  });
  el.joinCodeInput.addEventListener("input", () => {
    // Digits only; tolerate pasted spaces/dashes.
    el.joinCodeInput.value = el.joinCodeInput.value
      .replace(/\D/g, "")
      .slice(0, Online.CODE_LENGTH);
    setOnlineStatus("");
  });

  el.onlineCancelBtn.addEventListener("click", () => {
    Sounds.click();
    cancelOnlineLobby();
  });

  el.copyCodeBtn.addEventListener("click", async () => {
    const code = el.codeDisplay.dataset.code;
    if (!code) return;
    Sounds.click();
    let copied = false;
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
    } catch (e) {
      // Fallback for non-secure contexts / older browsers.
      const temp = document.createElement("textarea");
      temp.value = code;
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      try {
        copied = document.execCommand("copy");
      } catch (err) {}
      temp.remove();
    }
    el.copyCodeBtn.innerHTML = copied
      ? '<i class="fa-solid fa-check"></i> Copied!'
      : "Select the code and copy it";
    setTimeout(() => {
      el.copyCodeBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy code';
    }, 1600);
  });

  /* ── Match lifecycle ────────────────────────────────────── */
  function startOnlineGame() {
    const role = state.pendingRole === "guest" ? "guest" : "host";
    // The host plays X, the guest plays O. X opens round one, then it alternates.
    state.online = {
      role,
      mySymbol: role === "host" ? "X" : "O",
      connected: true,
      meReady: false,
      oppReady: false,
    };
    state.scores = { X: 0, O: 0, draw: 0 };
    state.starter = "X";
    updateScoreDisplay();

    const iAmX = role === "host";
    el.nameX.textContent = iAmX ? "You" : "Opponent";
    el.nameO.textContent = iAmX ? "Opponent" : "You";
    el.gameModeLabel.textContent = "Online Match";

    // Reset the lobby so it's clean when the player comes back home.
    showLobbyStep("choice");
    setOnlineStatus("");
    el.copyCodeBtn.disabled = true;
    el.joinCodeInput.value = "";

    switchScreen("game");
    resetRound();
  }

  function confirmLeaveOnline() {
    if (!state.online || !state.online.connected) return true;
    return window.confirm(
      "Leave this match? It will end the game for both players.",
    );
  }

  function leaveOnlineMatch() {
    if (state.online) {
      Online.leave();
      state.online = null;
    }
  }

  function handleOnlineMessage(message) {
    const online = state.online;
    if (!online) return;

    if (message.t === "move") {
      const index = message.i;
      const opponent = other(online.mySymbol);
      if (!Number.isInteger(index) || index < 0 || index > 8) return;
      if (state.gameOver || state.currentPlayer !== opponent) return;
      if (state.board[index] !== null) return;
      placeMove(index, opponent);
      return;
    }

    if (message.t === "ready") {
      online.oppReady = true;
      if (online.meReady && state.gameOver) {
        beginNextOnlineRound();
      } else {
        updateTurnIndicator();
        updateReplayButton();
      }
    }
  }

  function requestOnlineRematch() {
    const online = state.online;
    if (!online || !online.connected || !state.gameOver || online.meReady) return;
    online.meReady = true;
    Online.send({ t: "ready" });
    if (online.oppReady) {
      beginNextOnlineRound();
    } else {
      updateReplayButton();
    }
  }

  function beginNextOnlineRound() {
    state.online.meReady = false;
    state.online.oppReady = false;
    state.starter = other(state.starter);
    resetRound();
  }

  function handleOnlineDisconnect(reason) {
    // Dropped while still in the lobby (before a match started).
    if (!state.online) {
      showLobbyStep("choice");
      el.copyCodeBtn.disabled = true;
      setOnlineStatus("The connection was lost. Please try again.", true);
      return;
    }

    state.online.connected = false;
    state.online.meReady = false;
    state.online.oppReady = false;
    state.isThinking = false;

    if (!state.gameOver) {
      // Round abandoned: lock the board without awarding a point.
      state.gameOver = true;
    }

    showResult(
      "fa-solid fa-link-slash",
      reason === "left" ? "Your opponent left the game" : "Connection lost",
    );
    updateTurnIndicator();
    updateReplayButton();
  }

  /* ── "Play again" button state ──────────────────────────── */
  function updateReplayButton() {
    const btn = el.restartBtn;

    if (!isOnline()) {
      btn.disabled = false;
      btn.innerHTML = RESTART_HTML;
      return;
    }

    const { connected, meReady } = state.online;
    if (!connected || !state.gameOver) {
      // Online rounds can only be replayed once both players are done.
      btn.disabled = true;
      btn.innerHTML = RESTART_HTML;
    } else if (meReady) {
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fa-solid fa-hourglass-half"></i> Waiting for opponent…';
    } else {
      btn.disabled = false;
      btn.innerHTML = RESTART_HTML;
    }
  }
})();
