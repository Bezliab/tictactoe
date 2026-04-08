/**
 * ai.js
 * Tic Tac Toe AI logic.
 *
 * Easy mode: random empty cell (with occasional smart move).
 * Hard mode: unbeatable minimax algorithm.
 */

const AI = (() => {
  const WIN_COMBOS = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diagonals
  ];

  /** Returns the index of the best move for the given difficulty */
  function getBestMove(board, aiMark, difficulty) {
    const empty = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    if (empty.length === 0) return null;

    if (difficulty === 'easy') {
      // 25% chance to pick a smart move, otherwise random
      if (Math.random() < 0.25) {
        return smartMove(board, aiMark) ?? empty[Math.floor(Math.random() * empty.length)];
      }
      return empty[Math.floor(Math.random() * empty.length)];
    }

    // Hard: full minimax
    return minimaxMove(board, aiMark);
  }

  /** Quick look-ahead: win immediately or block opponent win */
  function smartMove(board, aiMark) {
    const humanMark = aiMark === 'X' ? 'O' : 'X';
    // Try to win
    const win = findWinningMove(board, aiMark);
    if (win !== null) return win;
    // Try to block
    return findWinningMove(board, humanMark);
  }

  function findWinningMove(board, mark) {
    for (const [a, b, c] of WIN_COMBOS) {
      const line = [board[a], board[b], board[c]];
      const markCount = line.filter(v => v === mark).length;
      const nullCount = line.filter(v => v === null).length;
      if (markCount === 2 && nullCount === 1) {
        return [a, b, c][line.indexOf(null)];
      }
    }
    return null;
  }

  /** Full minimax for unbeatable play */
  function minimaxMove(board, aiMark) {
    const humanMark = aiMark === 'X' ? 'O' : 'X';
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = aiMark;
      const score = minimax(board, 0, false, aiMark, humanMark, -Infinity, Infinity);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
    return bestMove;
  }

  function minimax(board, depth, isMaximizing, aiMark, humanMark, alpha, beta) {
    const result = checkWinner(board);
    if (result === aiMark) return 10 - depth;
    if (result === humanMark) return depth - 10;
    if (board.every(v => v !== null)) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        board[i] = aiMark;
        best = Math.max(best, minimax(board, depth + 1, false, aiMark, humanMark, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        board[i] = humanMark;
        best = Math.min(best, minimax(board, depth + 1, true, aiMark, humanMark, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function checkWinner(board) {
    for (const [a, b, c] of WIN_COMBOS) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  /** Returns winning combo indices or null */
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
