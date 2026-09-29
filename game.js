// =====================================================================
// 1. STAŁE KONFIGURACYJNE
// =====================================================================

const BOARD_SIZE = 20;
const INITIAL_LENGTH = 3;

const LEVELS = {
  easy:   { name: 'Łatwy',  interval: 200 },
  medium: { name: 'Średni', interval: 130 },
  hard:   { name: 'Trudny', interval: 80 },
};

const DIRECTIONS = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 },
};

const KEY_TO_DIRECTION = {
  arrowup: 'up',    w: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
};

// =====================================================================
// 2. STAN GRY
// =====================================================================

const state = {
  snake: [],              // tablica {x, y}; element 0 to głowa
  fruit: null,            // {x, y}
  direction: 'right',     // kierunek wykonany w ostatnim ruchu
  pendingDirection: null, // pierwszy poprawny kierunek wciśnięty w tej klatce
  score: 0,
  level: 'medium',
  screen: 'start',        // 'start' | 'play' | 'end'
};

let timerId = null;

function resetState(level) {
  state.snake = createInitialSnake();
  state.direction = 'right';
  state.pendingDirection = null;
  state.score = 0;
  state.level = level;
  state.fruit = randomFreeCell(state.snake);
}

// =====================================================================
// 3. PĘTLA GRY
// =====================================================================

function startLoop() {
  stopLoop();
  timerId = setInterval(gameTick, LEVELS[state.level].interval);
}

function stopLoop() {
  clearInterval(timerId);
  timerId = null;
}

// Jedno wywołanie = jeden ruch węża.
function gameTick() {
  const result = moveSnake(state);

  if (result === 'collision') {
    endGame(false);
    return;
  }
  if (result === 'win') {
    render();
    endGame(true);
    return;
  }
  render();
}

// =====================================================================
// 4. LOGIKA RUCHU (bez dostępu do DOM)
// =====================================================================

function createInitialSnake() {
  const center = Math.floor(BOARD_SIZE / 2);
  const snake = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.push({ x: center - i, y: center });
  }
  return snake;
}

// Zawinięcie współrzędnej: -1 -> 19, 20 -> 0.
function wrap(value) {
  return (value + BOARD_SIZE) % BOARD_SIZE;
}

function nextHeadPosition(head, directionName) {
  const delta = DIRECTIONS[directionName];
  return { x: wrap(head.x + delta.x), y: wrap(head.y + delta.y) };
}

function samePosition(a, b) {
  return a !== null && b !== null && a.x === b.x && a.y === b.y;
}

function isOpposite(dirA, dirB) {
  const a = DIRECTIONS[dirA];
  const b = DIRECTIONS[dirB];
  return a.x + b.x === 0 && a.y + b.y === 0;
}

// Jeśli wąż nie rośnie, ogon w tym ruchu się przesunie — jego komórka jest wolna.
function hitsBody(head, snake, willGrow) {
  const body = willGrow ? snake : snake.slice(0, -1);
  return body.some(segment => samePosition(segment, head));
}

function randomFreeCell(snake) {
  const freeCells = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = { x, y };
      if (!snake.some(segment => samePosition(segment, cell))) {
        freeCells.push(cell);
      }
    }
  }
  if (freeCells.length === 0) {
    return null;
  }
  return freeCells[Math.floor(Math.random() * freeCells.length)];
}

// Wykonuje jeden ruch. Zwraca: 'moved' | 'ate' | 'collision' | 'win'.
function moveSnake(game) {
  if (game.pendingDirection) {
    game.direction = game.pendingDirection;
    game.pendingDirection = null;
  }

  const newHead = nextHeadPosition(game.snake[0], game.direction);
  const eats = samePosition(newHead, game.fruit);

  if (hitsBody(newHead, game.snake, eats)) {
    return 'collision';
  }

  game.snake.unshift(newHead);

  if (!eats) {
    game.snake.pop();
    return 'moved';
  }

  game.score += 1;
  game.fruit = randomFreeCell(game.snake);
  return game.fruit === null ? 'win' : 'ate';
}

// =====================================================================
// 5. OBSŁUGA KLAWIATURY
// =====================================================================

// Przyjmuje tylko pierwszy poprawny kierunek w danej klatce.
function changeDirection(newDirection) {
  if (state.pendingDirection !== null) return;
  if (newDirection === state.direction) return;
  if (isOpposite(newDirection, state.direction)) return;
  state.pendingDirection = newDirection;
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  const isConfirmKey = key === 'enter' || key === ' ';

  if (state.screen === 'play') {
    const direction = KEY_TO_DIRECTION[key];
    if (direction || isConfirmKey) {
      event.preventDefault(); // blokuje przewijanie strony
    }
    if (direction) {
      changeDirection(direction);
    }
    return;
  }

  if (isConfirmKey) {
    event.preventDefault();
    if (state.screen === 'start') {
      startGame('medium');
    } else if (state.screen === 'end') {
      showScreen('start');
    }
  }
}

// =====================================================================
// 6. RENDEROWANIE
// =====================================================================

const boardElement = document.getElementById('board');
const scoreElement = document.getElementById('score');
const levelNameElement = document.getElementById('level-name');
const finalScoreElement = document.getElementById('final-score');
const endTitleElement = document.getElementById('end-title');

const cells = [];

// 400 komórek tworzonych jednorazowo.
function createBoard() {
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    boardElement.appendChild(cell);
    cells.push(cell);
  }
}

function cellAt(position) {
  return cells[position.y * BOARD_SIZE + position.x];
}

function render() {
  cells.forEach(cell => { cell.className = 'cell'; });

  state.snake.forEach((segment, index) => {
    cellAt(segment).classList.add(index === 0 ? 'head' : 'snake');
  });

  if (state.fruit) {
    cellAt(state.fruit).classList.add('fruit');
  }

  scoreElement.textContent = state.score;
  levelNameElement.textContent = LEVELS[state.level].name;
}

// =====================================================================
// 7. PRZEŁĄCZANIE EKRANÓW
// =====================================================================

const screens = {
  start: document.getElementById('start-screen'),
  play: document.getElementById('play-screen'),
  end: document.getElementById('end-screen'),
};

function showScreen(name) {
  state.screen = name;
  Object.entries(screens).forEach(([screenName, element]) => {
    element.classList.toggle('hidden', screenName !== name);
  });
}

function startGame(level) {
  resetState(level);
  render();
  showScreen('play');
  startLoop();
}

function endGame(isWin) {
  stopLoop();
  endTitleElement.textContent = isWin ? 'Wygrana!' : 'Koniec gry';
  finalScoreElement.textContent = state.score;
  showScreen('end');
}

// =====================================================================
// INICJALIZACJA
// =====================================================================

document.querySelectorAll('[data-level]').forEach(button => {
  button.addEventListener('click', () => startGame(button.dataset.level));
});

document.getElementById('restart-button').addEventListener('click', () => showScreen('start'));
document.addEventListener('keydown', handleKeydown);

createBoard();
showScreen('start');
