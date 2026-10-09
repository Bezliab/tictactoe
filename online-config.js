/**
 * online-config.js
 * Optional settings for online multiplayer.
 *
 * WHY THIS EXISTS
 * Online games connect the two phones/computers directly. On some networks
 * (many mobile-data connections, strict Wi-Fi) that direct connection is
 * blocked, and the join fails with "Couldn't connect". A TURN relay fixes
 * this by passing the game traffic through a middle server only when needed.
 *
 * HOW TO SET UP (Metered, free tier)
 * 1. Metered dashboard > TURN Server > "Add Credential".
 * 2. Copy that credential's API KEY (the "apiKey", NOT the account Secret Key).
 * 3. Replace YOUR_APP and YOUR_API_KEY below with your app name and that key.
 *
 * The apiKey is designed to be used in front-end code, but anyone can read
 * it, so if it's ever abused just delete that credential in the Metered
 * dashboard and add a new one. NEVER put the account Secret Key here.
 */
window.ONLINE_ICE_ENDPOINT =
  "    https://bezliab-tictactoe.metered.live/api/v1/turn/credential?apiKey=pk_live_ec8d04c66b998d33a493eaf7d54c5fb4f4ed17ad";
// Example:
// window.ONLINE_ICE_ENDPOINT =
//   "https://YOUR_APP.metered.live/api/v1/turn/credentials?apiKey=YOUR_API_KEY";
// RdIOEzyjnc_7f0vnFbFIfEEPdpr3PNQEu-NUNuEW5r9d4XEf - secret key (never put this in front-end code, only the apiKey above).
// How to get a permanent credential for the front-end code (not recommended, but possible):
// 1. Make a POST request to https://bezliab-tictactoe.metered.live/api/v1/turn/credentials with the secret key in the Authorization header (Bearer <secret_key>).
// 2. The response will contain a permanent credential that can be used by the front-end code to connect to the TURN server. The permanent credential will not expire, but it should be kept secret and not exposed to anyone else.
// 3. The front-end code should use the permanent credential to connect to the TURN server, and should not expose the secret key or the permanent credential to anyone else.
// 4. If the permanent credential is ever compromised, the server should revoke it and generate a new one using the secret key.
// How to make a POST request
// 1. Use a tool like Postman or curl to make the POST request.
// 2. Set the Authorization header to "Bearer <secret_key>".
// 3. Set the Content-Type header to "application/json".
// 4. Set the request body to an empty JSON object: {}.

/** Advanced: fixed servers instead (username/credential from any provider). */
window.ONLINE_ICE_SERVERS = [
  {
    urls: "stun:stun.relay.metered.ca:80",
  },
  {
    urls: "turn:standard.relay.metered.ca:80",
    username: "ac415c0715aaea4b55881eb2",
    credential: "A227n4Qt0oq29hCi",
  },
  {
    urls: "turn:standard.relay.metered.ca:80?transport=tcp",
    username: "ac415c0715aaea4b55881eb2",
    credential: "A227n4Qt0oq29hCi",
  },
  {
    urls: "turn:standard.relay.metered.ca:443",
    username: "ac415c0715aaea4b55881eb2",
    credential: "A227n4Qt0oq29hCi",
  },
  {
    urls: "turns:standard.relay.metered.ca:443?transport=tcp",
    username: "ac415c0715aaea4b55881eb2",
    credential: "A227n4Qt0oq29hCi",
  },
];
