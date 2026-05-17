// Minesweeper — Combo Edition
// Clean, modular vanilla JS implementation with comments and beginner-friendly names.

// Configuration
const ROWS = 10;
const COLS = 10;
const TOTAL_MINES = 15;

// Game state
let board = []; // 2D array of cell objects
let isGameOver = false;
let cellsOpened = 0;
let flagsPlaced = 0;
let comboCount = 0;
let hintAvailable = false;
let hintUsedThisCycle = false;
let specialReady = false; // becomes true at 10 combo and waits for next safe click

// DOM elements
const boardEl = document.getElementById('board');
const comboCountEl = document.getElementById('combo-count');
const minesLeftEl = document.getElementById('mines-left');
const hintStatusEl = document.getElementById('hint-status');
const hintButton = document.getElementById('hint-button');
const restartButton = document.getElementById('restart-button');
const overlay = document.getElementById('overlay');
const resultTitle = document.getElementById('result-title');
const resultText = document.getElementById('result-text');
const overlayRestart = document.getElementById('overlay-restart');
const comboPopup = document.getElementById('combo-popup');

// Utility: get neighbor coordinates
function getNeighbors(row, col) {
  const neighbors = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r === row && c === col) continue;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) neighbors.push([r, c]);
    }
  }
  return neighbors;
}

// Initialize empty board data structure
function createEmptyBoard() {
  board = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push({
        row: r,
        col: c,
        mine: false,
        open: false,
        flagged: false,
        adjacent: 0,
        element: null
      });
    }
    board.push(row);
  }
}

// Place mines randomly, avoid placing more than required
function placeMines(initialSafeRow = -1, initialSafeCol = -1) {
  // Optional: ensure the first clicked cell is safe by providing its coords
  let minesToPlace = TOTAL_MINES;
  while (minesToPlace > 0) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    const cell = board[r][c];
    // avoid duplicates and optionally avoid initial safe cell and its neighbors
    const isNearInitial = Math.abs(r - initialSafeRow) <= 1 && Math.abs(c - initialSafeCol) <= 1;
    if (!cell.mine && !(initialSafeRow >= 0 && isNearInitial)) {
      cell.mine = true;
      minesToPlace--;
    }
  }
}

// Count adjacent mines for every cell
function calculateAdjacency() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      let count = 0;
      getNeighbors(r, c).forEach(([nr, nc]) => {
        if (board[nr][nc].mine) count++;
      });
      cell.adjacent = count;
    }
  }
}

// Render board DOM elements
function renderBoard() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      const cellDiv = document.createElement('div');
      cellDiv.className = 'cell';
      cellDiv.dataset.row = r;
      cellDiv.dataset.col = c;
      cellDiv.setAttribute('data-number', cell.adjacent);
      const textSpan = document.createElement('span');
      textSpan.className = 'text';
      cellDiv.appendChild(textSpan);

      // Left-click
      cellDiv.addEventListener('click', (e) => handleLeftClick(e, cell));
      // Right-click flag toggle
      cellDiv.addEventListener('contextmenu', (e) => handleRightClick(e, cell));

      boardEl.appendChild(cellDiv);
      cell.element = cellDiv;
    }
  }
  // prevent native right-click menu on board
  boardEl.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Open a cell (left-click behavior)
function openCell(cell) {
  if (isGameOver || cell.open || cell.flagged) return;
  cell.open = true;
  const el = cell.element;
  el.classList.add('open');
  if (cell.mine) {
    el.classList.add('mine');
    el.querySelector('.text').textContent = '💣';
    // reveal all mines and lose
    revealAllMines();
    gameOver(false);
    return;
  }

  // Safe click — update combo
  cellsOpened++;
  incrementCombo();

  // show number or empty
  if (cell.adjacent > 0) {
    el.querySelector('.text').textContent = cell.adjacent;
    el.setAttribute('data-number', cell.adjacent);
  } else {
    el.querySelector('.text').textContent = '';
    // recursively open neighbors using a queue to avoid deep recursion
    const queue = [cell];
    while (queue.length) {
      const current = queue.shift();
      const neighbors = getNeighbors(current.row, current.col);
      neighbors.forEach(([nr, nc]) => {
        const neighborCell = board[nr][nc];
        if (!neighborCell.open && !neighborCell.flagged && !neighborCell.mine) {
          neighborCell.open = true;
          neighborCell.element.classList.add('open');
          if (neighborCell.adjacent > 0) {
            neighborCell.element.querySelector('.text').textContent = neighborCell.adjacent;
            neighborCell.element.setAttribute('data-number', neighborCell.adjacent);
            cellsOpened++;
          } else {
            cellsOpened++;
            queue.push(neighborCell);
          }
        }
      });
    }
  }

  // If special ability is waiting, and this was a safe click, trigger its effect
  if (specialReady) {
    triggerSpecialAbility(cell);
  }

  checkWinCondition();
}

// Handle left-click with special-case for first click placement
function handleLeftClick(event, cell) {
  if (isGameOver) return;
  // If flagged, ignore left-click
  if (cell.flagged) return;

  // On first click, ensure the clicked area is safe by placing mines afterward
  if (cellsOpened === 0 && flagsPlaced === 0 && !board.some(row=>row.some(c=>c.mine))) {
    // create mines avoiding first click and its neighbors
    placeMines(cell.row, cell.col);
    calculateAdjacency();
    // re-render numbers onto elements
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) board[r][c].element && board[r][c].element.setAttribute('data-number', board[r][c].adjacent);
  }

  openCell(cell);
}

// Toggle flag on right-click
function toggleFlag(cell) {
  if (isGameOver || cell.open) return;
  cell.flagged = !cell.flagged;
  if (cell.flagged) {
    cell.element.classList.add('flagged');
    cell.element.querySelector('.text').textContent = '🚩';
    flagsPlaced++;
  } else {
    cell.element.classList.remove('flagged');
    cell.element.querySelector('.text').textContent = '';
    flagsPlaced--;
  }
  updateTopStatus();
}

function handleRightClick(event, cell) {
  event.preventDefault();
  toggleFlag(cell);
}

// Reveal all mines visually (used on loss)
function revealAllMines() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (cell.mine) {
        cell.element.classList.add('open', 'mine');
        cell.element.querySelector('.text').textContent = '💣';
      }
    }
  }
}

function gameOver(won) {
  isGameOver = true;
  showOverlay(won ? 'You Win!' : 'Game Over', won ? 'Congratulations — you cleared the minefield.' : 'You clicked a mine. Try again!');
}

function showOverlay(title, text) {
  resultTitle.textContent = title;
  resultText.textContent = text;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

// Combo management
function incrementCombo() {
  comboCount++;
  comboCountEl.textContent = comboCount;
  showComboPopup(comboCount);
  // Unlock hint at 5 combo if not already used
  if (comboCount >= 5 && !hintUsedThisCycle) {
    hintAvailable = true;
    hintButton.disabled = false;
    hintStatusEl.textContent = 'Ready';
  }
  // Prepare special ability at 10 combo
  if (comboCount >= 10) {
    specialReady = true;
    // show 10 COMBO popup and visual cue
    showComboPopup(10, true);
    // do not reset combo yet — special triggers on next safe click
  }
}

function resetCombo() {
  comboCount = 0;
  comboCountEl.textContent = comboCount;
  hintAvailable = false;
  hintUsedThisCycle = false;
  hintButton.disabled = true;
  hintStatusEl.textContent = 'Locked';
  specialReady = false;
}

function showComboPopup(count, isTen=false) {
  // small popup text for combos
  comboPopup.innerHTML = '';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (count === 5) bubble.textContent = '5 COMBO!';
  else if (isTen) bubble.textContent = '10 COMBO!';
  else bubble.textContent = `${count} Combo`;
  comboPopup.appendChild(bubble);
  setTimeout(()=>{comboPopup.innerHTML = ''}, 900);
}

// Special ability: when active, next safe click auto-opens neighbors
function triggerSpecialAbility(triggerCell) {
  if (!specialReady) return;
  // visual effect on target cell
  const fx = document.createElement('div');
  fx.className = 'special-effect';
  triggerCell.element.appendChild(fx);

  // open all safe neighbors (and recursively open zeros)
  const neighbors = getNeighbors(triggerCell.row, triggerCell.col);
  neighbors.forEach(([nr, nc]) => {
    const ncell = board[nr][nc];
    if (!ncell.mine && !ncell.open && !ncell.flagged) {
      openCell(ncell);
    }
  });

  // Reset combo after activation
  resetCombo();
}

// Hint system: reveal one guaranteed safe unopened cell (visual highlight only)
function useHint() {
  if (!hintAvailable || hintUsedThisCycle || isGameOver) return;
  // gather safe unopened cells
  const safeCells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = board[r][c];
    if (!cell.open && !cell.mine && !cell.flagged) safeCells.push(cell);
  }
  if (safeCells.length === 0) return;
  // pick a random safe cell
  const pick = safeCells[Math.floor(Math.random() * safeCells.length)];
  // highlight it temporarily
  pick.element.classList.add('hint-highlight');
  setTimeout(()=>pick.element.classList.remove('hint-highlight'), 3000);
  hintUsedThisCycle = true;
  hintAvailable = false;
  hintButton.disabled = true;
  hintStatusEl.textContent = 'Used';
}

// Win check: when number of opened safe cells equals total safe cells
function checkWinCondition() {
  const totalSafe = ROWS * COLS - TOTAL_MINES;
  if (cellsOpened >= totalSafe && !isGameOver) {
    isGameOver = true;
    showOverlay('Victory!', 'You found all safe cells — well done!');
  }
}

// Update top status bar
function updateTopStatus() {
  minesLeftEl.textContent = Math.max(0, TOTAL_MINES - flagsPlaced);
  comboCountEl.textContent = comboCount;
  hintStatusEl.textContent = hintAvailable ? 'Ready' : (hintUsedThisCycle ? 'Used' : 'Locked');
}

// Reset the game state and UI
function resetGame() {
  isGameOver = false;
  cellsOpened = 0;
  flagsPlaced = 0;
  resetCombo();
  createEmptyBoard();
  // Initially do not place mines until first click to guarantee first safe
  renderBoard();
  updateTopStatus();
  hideOverlay();
}

// Event bindings
hintButton.addEventListener('click', () => useHint());
restartButton.addEventListener('click', () => resetGame());
overlayRestart.addEventListener('click', () => resetGame());

// Initialize everything on page load
function init() {
  createEmptyBoard();
  renderBoard();
  updateTopStatus();
}

// Start
init();

// Expose some functions for debugging (optional)
window._ms = { board, resetGame };
