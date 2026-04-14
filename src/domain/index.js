const SUDOKU_SIZE = 9;
const BOX_SIZE = 3;

function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

function assertGrid(grid, label = 'grid') {
  if (!Array.isArray(grid)) {
    throw new TypeError(label + ' must be a 9x9 array');
  }

  if (grid.length !== SUDOKU_SIZE) {
    throw new RangeError(label + ' must contain 9 rows');
  }

  for (let row = 0; row < SUDOKU_SIZE; row++) {
    if (!Array.isArray(grid[row]) || grid[row].length !== SUDOKU_SIZE) {
      throw new RangeError(label + '[' + row + '] must contain 9 numbers');
    }

    for (let col = 0; col < SUDOKU_SIZE; col++) {
      const value = grid[row][col];
      if (!Number.isInteger(value) || value < 0 || value > 9) {
        throw new RangeError(label + '[' + row + '][' + col + '] must be an integer in range 0..9');
      }
    }
  }
}

function assertMove(move) {
  if (!move || typeof move !== 'object') {
    throw new TypeError('move must be an object: { row, col, value }');
  }

  const { row, col, value } = move;

  if (!Number.isInteger(row) || row < 0 || row >= SUDOKU_SIZE) {
    throw new RangeError('move.row must be an integer in range 0..8');
  }

  if (!Number.isInteger(col) || col < 0 || col >= SUDOKU_SIZE) {
    throw new RangeError('move.col must be an integer in range 0..8');
  }

  if (!Number.isInteger(value) || value < 0 || value > 9) {
    throw new RangeError('move.value must be an integer in range 0..9');
  }
}

function hasDuplicate(values) {
  const used = new Set();

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value === 0) {
      continue;
    }

    if (used.has(value)) {
      return true;
    }

    used.add(value);
  }

  return false;
}

function collectInvalidCells(grid) {
  const invalid = new Set();

  for (let row = 0; row < SUDOKU_SIZE; row++) {
    const seen = new Map();
    for (let col = 0; col < SUDOKU_SIZE; col++) {
      const value = grid[row][col];
      if (value === 0) {
        continue;
      }
      const key = value;
      const previous = seen.get(key);
      if (previous !== undefined) {
        invalid.add(previous + ',' + row);
        invalid.add(col + ',' + row);
      } else {
        seen.set(key, col);
      }
    }
  }

  for (let col = 0; col < SUDOKU_SIZE; col++) {
    const seen = new Map();
    for (let row = 0; row < SUDOKU_SIZE; row++) {
      const value = grid[row][col];
      if (value === 0) {
        continue;
      }
      const key = value;
      const previous = seen.get(key);
      if (previous !== undefined) {
        invalid.add(col + ',' + previous);
        invalid.add(col + ',' + row);
      } else {
        seen.set(key, row);
      }
    }
  }

  for (let boxRow = 0; boxRow < SUDOKU_SIZE; boxRow += BOX_SIZE) {
    for (let boxCol = 0; boxCol < SUDOKU_SIZE; boxCol += BOX_SIZE) {
      const seen = new Map();
      for (let dy = 0; dy < BOX_SIZE; dy++) {
        for (let dx = 0; dx < BOX_SIZE; dx++) {
          const row = boxRow + dy;
          const col = boxCol + dx;
          const value = grid[row][col];
          if (value === 0) {
            continue;
          }
          const previous = seen.get(value);
          if (previous) {
            invalid.add(previous.col + ',' + previous.row);
            invalid.add(col + ',' + row);
          } else {
            seen.set(value, { row: row, col: col });
          }
        }
      }
    }
  }

  return Array.from(invalid);
}

function formatGrid(grid) {
  const rows = [];

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    const cells = [];

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];

      if (cell === 0) {
        cells.push('.');
      } else {
        cells.push(String(cell));
      }
    }

    rows.push(cells.join(' '));
  }

  return rows.join('\n');
}

/**
 * Create a Sudoku domain object from a 9x9 numeric grid.
 * @param {number[][]} input
 */
export function createSudoku(input) {
  assertGrid(input, 'input');
  let grid = cloneGrid(input);

  return {
    getGrid: function () {
      return cloneGrid(grid);
    },

    guess: function (move) {
      assertMove(move);
      grid[move.row][move.col] = move.value;
      return true;
    },

    validate: function () {
      const invalidCells = collectInvalidCells(grid);
      return {
        valid: invalidCells.length === 0,
        invalidCells: invalidCells,
      };
    },

    isMoveValid: function (move) {
      assertMove(move);

      const nextGrid = cloneGrid(grid);
      nextGrid[move.row][move.col] = move.value;
      return collectInvalidCells(nextGrid).length === 0;
    },

    isSolved: function () {
      const validation = collectInvalidCells(grid).length === 0;
      if (!validation) {
        return false;
      }

      for (let row = 0; row < SUDOKU_SIZE; row++) {
        if (hasDuplicate(grid[row])) {
          return false;
        }

        for (let col = 0; col < SUDOKU_SIZE; col++) {
          if (grid[row][col] === 0) {
            return false;
          }
        }
      }

      return true;
    },

    clone: function () {
      return createSudoku(grid);
    },

    toJSON: function () {
      return {
        grid: cloneGrid(grid),
      };
    },

    toString: function () {
      return 'Sudoku\n' + formatGrid(grid);
    },
  };
}

/**
 * Restore a Sudoku domain object from plain JSON data.
 * @param {{grid:number[][]}} json
 */
export function createSudokuFromJSON(json) {
  if (!json || typeof json !== 'object') {
    throw new TypeError('json must be an object with a grid field');
  }

  assertGrid(json.grid, 'json.grid');
  return createSudoku(json.grid);
}

/**
 * Create a Game aggregate that manages Sudoku plus undo/redo history.
 * @param {{sudoku:ReturnType<typeof createSudoku>,undoStack?:Array<any>,redoStack?:Array<any>}} options
 */
export function createGame(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }

  const sudoku = options.sudoku;
  if (!sudoku || typeof sudoku.clone !== 'function' || typeof sudoku.guess !== 'function') {
    throw new TypeError('options.sudoku must be a valid Sudoku object');
  }

  const undoStack = options.undoStack || [];
  const redoStack = options.redoStack || [];

  if (!Array.isArray(undoStack) || !Array.isArray(redoStack)) {
    throw new TypeError('undoStack and redoStack must be arrays');
  }

  let currentSudoku = sudoku.clone();

  const undoList = [];
  const redoList = [];

  for (let i = 0; i < undoStack.length; i++) {
    undoList.push(undoStack[i].clone());
  }

  for (let i = 0; i < redoStack.length; i++) {
    redoList.push(redoStack[i].clone());
  }

  return {
    getSudoku: function () {
      return currentSudoku;
    },

    guess: function (move) {
      undoList.push(currentSudoku.clone());
      currentSudoku.guess(move);
      redoList.length = 0;
    },

    undo: function () {
      if (undoList.length === 0) {
        return;
      }

      redoList.push(currentSudoku.clone());
      currentSudoku = undoList.pop();
    },

    redo: function () {
      if (redoList.length === 0) {
        return;
      }

      undoList.push(currentSudoku.clone());
      currentSudoku = redoList.pop();
    },

    canUndo: function () {
      return undoList.length > 0;
    },

    canRedo: function () {
      return redoList.length > 0;
    },

    toJSON: function () {
      const undoJson = [];
      const redoJson = [];

      for (let i = 0; i < undoList.length; i++) {
        undoJson.push(undoList[i].toJSON());
      }

      for (let i = 0; i < redoList.length; i++) {
        redoJson.push(redoList[i].toJSON());
      }

      return {
        sudoku: currentSudoku.toJSON(),
        undoStack: undoJson,
        redoStack: redoJson,
      };
    },
  };
}

/**
 * Restore a Game aggregate from serialized plain data.
 * @param {{sudoku:{grid:number[][]},undoStack:Array<{grid:number[][]}>,redoStack:Array<{grid:number[][]}>}} json
 */
export function createGameFromJSON(json) {
  if (!json || typeof json !== 'object') {
    throw new TypeError('json must be an object');
  }

  if (!Array.isArray(json.undoStack) || !Array.isArray(json.redoStack)) {
    throw new TypeError('json.undoStack and json.redoStack must be arrays');
  }

  const sudoku = createSudokuFromJSON(json.sudoku);

  const undoStack = [];
  for (let i = 0; i < json.undoStack.length; i++) {
    undoStack.push(createSudokuFromJSON(json.undoStack[i]));
  }

  const redoStack = [];
  for (let i = 0; i < json.redoStack.length; i++) {
    redoStack.push(createSudokuFromJSON(json.redoStack[i]));
  }

  return createGame({
    sudoku: sudoku,
    undoStack: undoStack,
    redoStack: redoStack,
  });
}
