// =====================================================================
// 1. STAŁE KONFIGURACYJNE
// =====================================================================

const BOARD_SIZE = 20;
const INITIAL_LENGTH = 3;
const NICK_MIN = 3;
const NICK_MAX = 16;
const PASSWORD_MIN = 6;
const LOGIN_PATTERN = /^[a-z0-9_-]{3,16}$/; // login trafia do adresu e-mail, więc tylko ASCII
const AUTOSAVE_INTERVAL = 5000; // ms między automatycznymi zapisami gry
const COUNTDOWN_FROM = 3;       // odliczanie przed wznowieniem gry

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
// 4a. ZAPIS STANU GRY (bez dostępu do DOM)
// =====================================================================

// Przycięty nick albo null, gdy długość jest poza zakresem.
function normalizeNick(raw) {
  if (typeof raw !== 'string') return null;
  const nick = raw.trim();
  return nick.length >= NICK_MIN && nick.length <= NICK_MAX ? nick : null;
}

// Login konta małymi literami albo null, gdy zawiera niedozwolone znaki.
function normalizeLogin(raw) {
  if (typeof raw !== 'string') return null;
  const login = raw.trim().toLowerCase();
  return LOGIN_PATTERN.test(login) ? login : null;
}

// Kopia stanu gry w formacie tabeli saved_games.
function toSavedGame(game) {
  return {
    level: game.level,
    snake: game.snake.map(segment => ({ x: segment.x, y: segment.y })),
    fruit: { x: game.fruit.x, y: game.fruit.y },
    direction: game.direction,
    score: game.score,
  };
}

function isValidCell(cell) {
  return cell !== null && typeof cell === 'object'
    && Number.isInteger(cell.x) && Number.isInteger(cell.y)
    && cell.x >= 0 && cell.x < BOARD_SIZE
    && cell.y >= 0 && cell.y < BOARD_SIZE;
}

// Zapis z bazy mógł zostać uszkodzony lub zmieniony ręcznie — sprawdzamy wszystko.
function isValidSavedGame(saved) {
  if (saved === null || typeof saved !== 'object') return false;
  if (!Object.hasOwn(LEVELS, saved.level)) return false;
  if (!Object.hasOwn(DIRECTIONS, saved.direction)) return false;

  const snake = saved.snake;
  if (!Array.isArray(snake)) return false;
  if (snake.length < INITIAL_LENGTH || snake.length > BOARD_SIZE * BOARD_SIZE) return false;
  if (!snake.every(isValidCell)) return false;
  if (new Set(snake.map(cell => cell.y * BOARD_SIZE + cell.x)).size !== snake.length) return false;

  if (!isValidCell(saved.fruit)) return false;
  if (snake.some(segment => samePosition(segment, saved.fruit))) return false;

  return saved.score === snake.length - INITIAL_LENGTH;
}

function restoreState(saved) {
  state.snake = saved.snake.map(segment => ({ x: segment.x, y: segment.y }));
  state.fruit = { x: saved.fruit.x, y: saved.fruit.y };
  state.direction = saved.direction;
  state.pendingDirection = null;
  state.score = saved.score;
  state.level = saved.level;
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

function segmentClass(index, length) {
  if (index === 0) return 'head';
  if (index === length - 1) return 'tail';
  return 'snake';
}

function render() {
  cells.forEach(cell => { cell.className = 'cell'; });

  state.snake.forEach((segment, index) => {
    cellAt(segment).classList.add(segmentClass(index, state.snake.length));
  });

  // Klasa kierunku ustawia oczy głowy od strony ruchu.
  cellAt(state.snake[0]).classList.add('dir-' + state.direction);

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
