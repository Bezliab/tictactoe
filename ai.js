/**
 * ai.js
 * Tic Tac Toe AI logic driven by level profiles.
 */

const AI = (() => {
  const WIN_COMBOS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  function getBestMove(board, aiMark, difficulty) {
    const level = window.getGameLevel ? window.getGameLevel(difficulty) : null;
    const profile = level?.profile || {};
    const empty = getEmptyCells(board);

    if (empty.length === 0) return null;

    const immediateMove = getPriorityMove(board, aiMark, profile, empty);
    if (immediateMove !== null) return immediateMove;

    if (profile.depthLimit === null) {
      return minimaxMove(board, aiMark);
    }

    if (typeof profile.depthLimit === "number" && profile.depthLimit > 0) {
      return minimaxMove(board, aiMark, profile.depthLimit);
    }

    return randomMove(empty);
  }

  function getPriorityMove(board, aiMark, profile, empty) {
    const smartChance = profile.smartChance ?? 0;

    if (Math.random() < smartChance) {
      const tactical = smartMove(board, aiMark);
      if (tactical !== null) return tactical;
    }

    if (board[4] === null && Math.random() < (profile.centerChance ?? 0)) {
      return 4;
    }

    const corners = [0, 2, 6, 8].filter((index) => board[index] === null);
    if (corners.length && Math.random() < (profile.cornerChance ?? 0)) {
      return randomMove(corners);
    }

    return randomMove(empty);
  }

  function getEmptyCells(board) {
    return board
      .map((value, index) => (value === null ? index : null))
      .filter((value) => value !== null);
  }

  function randomMove(cells) {
    return cells[Math.floor(Math.random() * cells.length)];
  }

  function smartMove(board, aiMark) {
    const humanMark = aiMark === "X" ? "O" : "X";
    const winMove = findWinningMove(board, aiMark);
    if (winMove !== null) return winMove;
    return findWinningMove(board, humanMark);
  }

  function findWinningMove(board, mark) {
    for (const [a, b, c] of WIN_COMBOS) {
      const line = [board[a], board[b], board[c]];
      const markCount = line.filter((value) => value === mark).length;
      const nullCount = line.filter((value) => value === null).length;

      if (markCount === 2 && nullCount === 1) {
        return [a, b, c][line.indexOf(null)];
      }
    }
    return null;
  }

  function minimaxMove(board, aiMark, depthLimit = null) {
    const humanMark = aiMark === "X" ? "O" : "X";
    let bestScore = -Infinity;
    let bestMove = null;

    for (let index = 0; index < 9; index++) {
      if (board[index] !== null) continue;

      board[index] = aiMark;
      const score = minimax(
        board,
        0,
        false,
        aiMark,
        humanMark,
        -Infinity,
        Infinity,
        depthLimit,
      );
      board[index] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = index;
      }
    }

    return bestMove;
  }

  function minimax(
    board,
    depth,
    isMaximizing,
    aiMark,
    humanMark,
    alpha,
    beta,
    depthLimit,
  ) {
    const result = checkWinner(board);
    if (result === aiMark) return 10 - depth;
    if (result === humanMark) return depth - 10;
    if (board.every((value) => value !== null)) return 0;

    if (depthLimit !== null && depth >= depthLimit) {
      return heuristicScore(board, aiMark, humanMark);
    }

    if (isMaximizing) {
      let best = -Infinity;
      for (let index = 0; index < 9; index++) {
        if (board[index] !== null) continue;
        board[index] = aiMark;
        best = Math.max(
          best,
          minimax(
            board,
            depth + 1,
            false,
            aiMark,
            humanMark,
            alpha,
            beta,
            depthLimit,
          ),
        );
        board[index] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }

    let best = Infinity;
    for (let index = 0; index < 9; index++) {
      if (board[index] !== null) continue;
      board[index] = humanMark;
      best = Math.min(
        best,
        minimax(
          board,
          depth + 1,
          true,
          aiMark,
          humanMark,
          alpha,
          beta,
          depthLimit,
        ),
      );
      board[index] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  function heuristicScore(board, aiMark, humanMark) {
    let score = 0;

    for (const combo of WIN_COMBOS) {
      const line = combo.map((index) => board[index]);
      const aiCount = line.filter((value) => value === aiMark).length;
      const humanCount = line.filter((value) => value === humanMark).length;
      const emptyCount = line.filter((value) => value === null).length;

      if (aiCount === 2 && emptyCount === 1) score += 6;
      else if (aiCount === 1 && emptyCount === 2) score += 2;

      if (humanCount === 2 && emptyCount === 1) score -= 7;
      else if (humanCount === 1 && emptyCount === 2) score -= 2;
    }

    if (board[4] === aiMark) score += 3;
    if (board[4] === humanMark) score -= 3;

    return score;
  }

  function checkWinner(board) {
    for (const [a, b, c] of WIN_COMBOS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  function getWinningCombo(board) {
    for (const combo of WIN_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return combo;
      }
    }
    return null;
  }

  return { getBestMove, getWinningCombo, checkWinner };
})();
