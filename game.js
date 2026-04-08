/**
 * game.js
 * Main game controller: UI, state, turns, win detection.
 */

(() => {
  /* ── State ─────────────────────────────────────────────── */
  const state = {
    mode: null, // 'pvp' | 'pvc'
    difficulty: "easy", // 'easy' | 'hard'
    board: Array(9).fill(null),
    currentPlayer: "X",
    scores: { X: 0, O: 0, draw: 0 },
    gameOver: false,
    isThinking: false,
  };

  /* ── DOM ────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const el = {
    homeScreen: $("homeScreen"),
    gameScreen: $("gameScreen"),
    themeToggle: $("themeToggle"),
    themeIcon: $("themeIcon"),
    pvpBtn: $("pvpBtn"),
    pvcBtn: $("pvcBtn"),
    diffSection: $("difficultySection"),
    diffBtns: document.querySelectorAll(".diff-btn"),
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

  /* ── Theme ──────────────────────────────────────────────── */
  let theme = localStorage.getItem("ttt-theme") || "dark";
  applyTheme(theme);

  el.themeToggle.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    localStorage.setItem("ttt-theme", theme);
    Sounds.click();
  });

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    // Use Font Awesome icons instead of emoji
    el.themeIcon.innerHTML =
      t === "dark"
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

  function selectMode(mode) {
    state.mode = mode;
    el.pvpBtn.classList.toggle("selected", mode === "pvp");
    el.pvcBtn.classList.toggle("selected", mode === "pvc");
    el.diffSection.classList.toggle("hidden", mode !== "pvc");
    el.startBtn.classList.remove("hidden");
  }

  el.diffBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      el.diffBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.difficulty = btn.dataset.diff;
      Sounds.click();
    });
  });

  el.startBtn.addEventListener("click", () => {
    if (!state.mode) return;
    Sounds.click();
    startGame();
  });

  /* ── Game Start ─────────────────────────────────────────── */
  function startGame() {
    // Reset scores on fresh game start
    state.scores = { X: 0, O: 0, draw: 0 };
    updateScoreDisplay();

    // Labels
    if (state.mode === "pvp") {
      el.nameX.textContent = "Player 1";
      el.nameO.textContent = "Player 2";
      el.gameModeLabel.textContent = "Player vs Player";
    } else {
      el.nameX.textContent = "You";
      el.nameO.textContent =
        state.difficulty === "hard" ? "AI (Hard)" : "AI (Easy)";
      el.gameModeLabel.textContent = `vs Computer · ${state.difficulty}`;
    }

    switchScreen("game");
    resetRound();
  }

  /* ── Back to Home ───────────────────────────────────────── */
  el.backBtn.addEventListener("click", () => {
    Sounds.click();
    switchScreen("home");
  });

  /* ── Screen Switch ──────────────────────────────────────── */
  function switchScreen(name) {
    el.homeScreen.classList.toggle("active", name === "home");
    el.gameScreen.classList.toggle("active", name === "game");
  }

  /* ── Round Reset ────────────────────────────────────────── */
  function resetRound() {
    state.board = Array(9).fill(null);
    state.currentPlayer = "X";
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
  }

  /* ── Cell Click ─────────────────────────────────────────── */
  el.cells.forEach((cell) => {
    cell.addEventListener("click", () =>
      handleCellClick(parseInt(cell.dataset.index)),
    );
  });

  function handleCellClick(index) {
    if (state.gameOver || state.isThinking) return;
    if (state.board[index] !== null) return;
    // In PvC, only human (X) can click
    if (state.mode === "pvc" && state.currentPlayer === "O") return;

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

      // Trigger AI move
      if (state.mode === "pvc" && state.currentPlayer === "O") {
        triggerAIMove();
      }
    }
  }

  /* ── AI Move ────────────────────────────────────────────── */
  function triggerAIMove() {
    state.isThinking = true;
    el.board.classList.add("thinking");

    const delay = state.difficulty === "hard" ? 500 : 350;
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
      state.scores[winner]++;
      updateScoreDisplay(winner);
      // Use trophy for human win, robot for computer
      showResult(
        winner === "X" ? "fa-solid fa-trophy" : "fa-solid fa-robot",
        getWinMessage(winner),
      );
      Sounds.win();
      state.gameOver = true;
      return true;
    }
    if (state.board.every((v) => v !== null)) {
      state.scores.draw++;
      updateScoreDisplay("draw");
      showResult("fa-solid fa-handshake", "It's a Draw!");
      Sounds.draw();
      state.gameOver = true;
      return true;
    }
    return false;
  }

  function getWinMessage(winner) {
    if (state.mode === "pvp") {
      return winner === "X" ? "Player 1 Wins!" : "Player 2 Wins!";
    }
    return winner === "X" ? "You Win!" : "Computer Wins!";
  }

  /* ── Winning Line ───────────────────────────────────────── */
  // Maps combo patterns to SVG line coordinates in a 3×3 viewBox
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
    combo.forEach((i) => el.cells[i].classList.add("win-cell"));

    const key = [...combo].sort((a, b) => a - b).join("");
    const coords = LINE_COORDS[key];
    if (coords) {
      const { x1, y1, x2, y2 } = coords;
      el.winLine.setAttribute("x1", x1);
      el.winLine.setAttribute("y1", y1);
      el.winLine.setAttribute("x2", x2);
      el.winLine.setAttribute("y2", y2);
      // Estimate stroke-dasharray length in viewBox units
      const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      el.winLine.style.strokeDasharray = len;
      el.winLine.style.strokeDashoffset = len;
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

  function bump(el) {
    el.classList.remove("score-bump");
    void el.offsetWidth;
    el.classList.add("score-bump");
  }

  /* ── Turn Indicator ─────────────────────────────────────── */
  function updateTurnIndicator() {
    const p = state.currentPlayer;
    const isX = p === "X";
    el.turnBadge.textContent = p;
    el.turnBadge.className = `turn-badge ${isX ? "x-color" : "o-color"}`;

    if (state.mode === "pvp") {
      el.turnText.textContent = isX ? "Player 1's turn" : "Player 2's turn";
    } else {
      el.turnText.textContent = isX ? "Your turn" : "Computer thinking…";
    }

    el.scoreCardX.classList.toggle("active-turn", isX);
    el.scoreCardO.classList.toggle("active-turn", !isX);
  }

  /* ── Result Banner ──────────────────────────────────────── */
  function showResult(icon, text) {
    // icon is a Font Awesome class string, set as innerHTML
    el.resultIcon.innerHTML = `<i class="${icon}"></i>`;
    el.resultText.textContent = text;
    el.resultBanner.classList.remove("hidden");
  }

  /* ── Buttons ────────────────────────────────────────────── */
  el.restartBtn.addEventListener("click", () => {
    Sounds.click();
    resetRound();
  });

  el.newMatchBtn.addEventListener("click", () => {
    Sounds.click();
    switchScreen("home");
    // Reset mode selection
    el.pvpBtn.classList.remove("selected");
    el.pvcBtn.classList.remove("selected");
    el.diffSection.classList.add("hidden");
    el.startBtn.classList.add("hidden");
    state.mode = null;
  });
})();
