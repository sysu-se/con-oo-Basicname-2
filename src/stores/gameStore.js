import { writable } from 'svelte/store';
import { createGame, createSudoku } from '../domain/index.js';

const SUDOKU_SIZE = 9;

export const DEFAULT_PUZZLE = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

function ensureGrid(grid, label = 'grid') {
  if (!Array.isArray(grid) || grid.length !== SUDOKU_SIZE) {
    throw new TypeError(label + ' must be a 9x9 array');
  }

  for (let row = 0; row < SUDOKU_SIZE; row++) {
    if (!Array.isArray(grid[row]) || grid[row].length !== SUDOKU_SIZE) {
      throw new TypeError(label + '[' + row + '] must be a length-9 array');
    }

    for (let col = 0; col < SUDOKU_SIZE; col++) {
      const value = grid[row][col];
      if (!Number.isInteger(value) || value < 0 || value > 9) {
        throw new RangeError(label + '[' + row + '][' + col + '] must be an integer in range 0..9');
      }
    }
  }
}

function keyFromCell(row, col) {
  return row + ',' + col;
}

function readDomainState(game, selected, fixedCells, message) {
  const sudoku = game.getSudoku();
  const grid = sudoku.getGrid();
  const validation = typeof sudoku.validate === 'function'
    ? sudoku.validate()
    : { valid: true, invalidCells: [] };

  return {
    grid,
    selected,
    fixedCells,
    invalidCells: validation.invalidCells || [],
    won: typeof sudoku.isSolved === 'function' ? sudoku.isSolved() : false,
    canUndo: game.canUndo(),
    canRedo: game.canRedo(),
    message,
  };
}

/**
 * Create a Svelte store adapter that exposes Game/Sudoku state to UI.
 * @param {number[][]} initialGrid
 */
export function createGameStore(initialGrid = DEFAULT_PUZZLE) {
  ensureGrid(initialGrid, 'initialGrid');

  const fixedCells = new Set();
  for (let row = 0; row < SUDOKU_SIZE; row++) {
    for (let col = 0; col < SUDOKU_SIZE; col++) {
      if (initialGrid[row][col] !== 0) {
        fixedCells.add(keyFromCell(row, col));
      }
    }
  }

  let selected = { row: 0, col: 0 };
  let game = createGame({ sudoku: createSudoku(cloneGrid(initialGrid)) });
  const store = writable(readDomainState(game, selected, fixedCells, ''));

  function commit(message = '') {
    store.set(readDomainState(game, selected, fixedCells, message));
  }

  return {
    subscribe: store.subscribe,

    selectCell(row, col) {
      if (!Number.isInteger(row) || !Number.isInteger(col)) {
        commit('请选择有效的单元格。');
        return;
      }

      if (row < 0 || row >= SUDOKU_SIZE || col < 0 || col >= SUDOKU_SIZE) {
        commit('单元格越界。');
        return;
      }

      selected = { row, col };
      commit('');
    },

    guess(value) {
      if (!selected) {
        commit('请先选择单元格。');
        return;
      }

      if (!Number.isInteger(value) || value < 0 || value > 9) {
        commit('请输入 0 到 9 的整数。');
        return;
      }

      if (fixedCells.has(keyFromCell(selected.row, selected.col))) {
        commit('题目给定数字不可修改。');
        return;
      }

      try {
        game.guess({ row: selected.row, col: selected.col, value });
        commit('');
      } catch (error) {
        const text = error instanceof Error ? error.message : '输入失败';
        commit(text);
      }
    },

    undo() {
      if (!game.canUndo()) {
        commit('没有可撤销的操作。');
        return;
      }
      game.undo();
      commit('');
    },

    redo() {
      if (!game.canRedo()) {
        commit('没有可重做的操作。');
        return;
      }
      game.redo();
      commit('');
    },

    restart() {
      game = createGame({ sudoku: createSudoku(cloneGrid(initialGrid)) });
      selected = { row: 0, col: 0 };
      commit('');
    },
  };
}

export const gameStore = createGameStore();
