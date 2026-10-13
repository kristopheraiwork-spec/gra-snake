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
let dbQueue = Promise.resolve(); // operacje na bazie wykonywane po kolei
let boardLevel = 'medium';       // poziom pokazywany w rankingu na ekranie startowym

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
  const isPauseKey = key === 'p' || key === 'escape';

  // Podczas wpisywania nicku litery i spacja trafiają do pola; Enter startuje grę.
  if (event.target === nickInput && key !== 'enter') return;

  if (state.screen === 'play') {
    const direction = KEY_TO_DIRECTION[key];
    if (direction || isConfirmKey) {
      event.preventDefault(); // blokuje przewijanie strony
    }
    if (direction) {
      changeDirection(direction);
    } else if (isPauseKey) {
      pauseGame();
    }
    return;
  }

  if (state.screen === 'countdown') {
    if (KEY_TO_DIRECTION[key] || isConfirmKey) {
      event.preventDefault();
    }
    return;
  }

  if (state.screen === 'pause') {
    if (isConfirmKey || isPauseKey) {
      event.preventDefault();
      resumeGame();
    }
    return;
  }

  if (isConfirmKey) {
    event.preventDefault();
    if (state.screen === 'start') {
      startGame('medium');
    } else if (state.screen === 'end') {
      goToStart();
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
const nickInput = document.getElementById('nick-input');
const nickMessage = document.getElementById('nick-message');
const startLeaderboardElement = document.getElementById('start-leaderboard');
const endLeaderboardElement = document.getElementById('end-leaderboard');
const scoreMessageElement = document.getElementById('score-message');
const saveStatusElement = document.getElementById('save-status');
const resumeButton = document.getElementById('resume-button');
const pauseOverlay = document.getElementById('pause-overlay');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownElement = document.getElementById('countdown');

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

function showMessage(element, text) {
  element.textContent = text;
  element.classList.remove('hidden');
}

function hideMessage(element) {
  element.classList.add('hidden');
}

function renderLeaderboardNote(listElement, text) {
  const item = document.createElement('li');
  item.className = 'leaderboard-note';
  item.textContent = text;
  listElement.replaceChildren(item);
}

function leaderboardCell(className, text) {
  const cell = document.createElement('span');
  cell.className = className;
  cell.textContent = text;
  return cell;
}

// Nicki pochodzą od innych graczy — wyłącznie textContent, nigdy innerHTML.
function renderLeaderboard(listElement, rows, highlightId) {
  if (rows === null) {
    renderLeaderboardNote(listElement, 'Ranking niedostępny – brak połączenia');
    return;
  }
  if (rows.length === 0) {
    renderLeaderboardNote(listElement, 'Brak wyników – zagraj jako pierwszy!');
    return;
  }
  listElement.replaceChildren();
  rows.forEach(row => {
    const item = document.createElement('li');
    item.className = 'leaderboard-row';
    if (highlightId !== null && row.player_id === highlightId) {
      item.classList.add('own');
    }
    item.appendChild(leaderboardCell('leaderboard-pos', `${row.position}.`));
    item.appendChild(leaderboardCell('leaderboard-nick', row.has_account ? `${row.nick} ✓` : row.nick));
    item.appendChild(leaderboardCell('leaderboard-score', row.score));
    listElement.appendChild(item);
  });
}

// =====================================================================
// 7. PRZEŁĄCZANIE EKRANÓW
// =====================================================================

const screens = {
  start: document.getElementById('start-screen'),
  play: document.getElementById('play-screen'),
  end: document.getElementById('end-screen'),
};

// Pauza i odliczanie to nakładki na ekranie rozgrywki.
const SCREEN_SECTION = { start: 'start', play: 'play', pause: 'play', countdown: 'play', end: 'end' };

function showScreen(name) {
  state.screen = name;
  Object.entries(screens).forEach(([screenName, element]) => {
    element.classList.toggle('hidden', screenName !== SCREEN_SECTION[name]);
  });
  pauseOverlay.classList.toggle('hidden', name !== 'pause');
  countdownOverlay.classList.toggle('hidden', name !== 'countdown');
}

function startGame(level) {
  const nick = normalizeNick(nickInput.value);
  if (nick === null) {
    showMessage(nickMessage, `Wpisz nick (${NICK_MIN}–${NICK_MAX} znaków)`);
    nickInput.focus();
    return;
  }
  hideMessage(nickMessage);
  updateResumeButton(null);
  dbOnline = false;
  setSaveIndicator('');
  resetState(level);
  render();
  showScreen('play');
  startLoop();
  startAutosave();

  // Logowanie i usunięcie starego zapisu w tle — gra nie czeka na bazę.
  enqueueDb(async () => {
    dbOnline = await ensurePlayer(nick);
    if (dbOnline) {
      await deleteSavedGame();
    } else {
      setSaveIndicator('○ gra bez rankingu i zapisu');
    }
  });
}

function endGame(isWin) {
  stopLoop();
  stopAutosave();
  endTitleElement.textContent = isWin ? 'Wygrana!' : 'Koniec gry';
  finalScoreElement.textContent = state.score;
  hideMessage(scoreMessageElement);
  renderLeaderboardNote(endLeaderboardElement, 'Ładowanie rankingu…');
  showScreen('end');

  const level = state.level;
  const score = state.score;
  enqueueDb(async () => {
    await deleteSavedGame();
    const saved = await addScore(level, score);
    const rows = await getLeaderboard(level);
    if (!saved) {
      showMessage(scoreMessageElement, 'Nie udało się zapisać wyniku w rankingu');
    }
    renderLeaderboard(endLeaderboardElement, rows, getPlayerId());
  });
}

// =====================================================================
// 8. BAZA W TLE, PAUZA I WZNAWIANIE
// =====================================================================

let autosaveId = null;
let autosaveBusy = false;
let countdownId = null;
let dbOnline = false;        // czy gracz jest zalogowany i można zapisywać
let resumeCandidate = null;  // poprawny zapis gotowy do wznowienia

// Operacje na bazie idą po kolei, więc np. zapis gry nie wyprzedzi jej usunięcia.
function enqueueDb(task) {
  dbQueue = dbQueue.then(task).catch(() => null);
  return dbQueue;
}

function showLeaderboardTab(level) {
  boardLevel = level;
  document.querySelectorAll('[data-board-level]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.boardLevel === level);
  });
  renderLeaderboardNote(startLeaderboardElement, 'Ładowanie rankingu…');
  getLeaderboard(level).then(rows => {
    if (boardLevel === level) {
      renderLeaderboard(startLeaderboardElement, rows, getPlayerId());
    }
  });
}

function refreshStartScreen() {
  showLeaderboardTab(boardLevel);
  enqueueDb(async () => {
    const player = await getStoredPlayer();
    if (player && nickInput.value.trim() === '') {
      nickInput.value = player.nick;
    }
    updateResumeButton(player ? await loadSavedGame() : null);
  });
}

function goToStart() {
  showScreen('start');
  refreshStartScreen();
}

function setSaveIndicator(text) {
  saveStatusElement.textContent = text;
}

// Migawka stanu jest robiona od razu, zapis czeka w kolejce.
function saveNow() {
  if (!dbOnline) return Promise.resolve(false);
  const snapshot = toSavedGame(state);
  return enqueueDb(() => saveGame(snapshot)).then(ok => {
    setSaveIndicator(ok ? '● zapisano' : '○ brak zapisu');
    return ok;
  });
}

// Jeśli poprzedni automatyczny zapis jeszcze trwa, kolejny jest pomijany.
function autosave() {
  if (autosaveBusy) return;
  autosaveBusy = true;
  saveNow().then(() => { autosaveBusy = false; });
}

function startAutosave() {
  stopAutosave();
  autosaveId = setInterval(autosave, AUTOSAVE_INTERVAL);
}

function stopAutosave() {
  clearInterval(autosaveId);
  autosaveId = null;
}

function startCountdown() {
  let remaining = COUNTDOWN_FROM;
  countdownElement.textContent = remaining;
  showScreen('countdown');
  stopCountdown();
  countdownId = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      countdownElement.textContent = remaining;
      return;
    }
    stopCountdown();
    showScreen('play');
    startLoop();
    startAutosave();
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownId);
  countdownId = null;
}

function pauseGame() {
  if (state.screen !== 'play' && state.screen !== 'countdown') return;
  stopLoop();
  stopCountdown();
  stopAutosave();
  showScreen('pause');
  saveNow();
}

function resumeGame() {
  if (state.screen !== 'pause') return;
  startCountdown();
}

function exitToMenu() {
  if (state.screen !== 'pause') return;
  goToStart();
}

function updateResumeButton(saved) {
  if (saved && isValidSavedGame(saved)) {
    resumeCandidate = saved;
    resumeButton.textContent = `Wznów grę (${LEVELS[saved.level].name}, wynik ${saved.score})`;
    resumeButton.classList.remove('hidden');
    return;
  }
  resumeCandidate = null;
  resumeButton.classList.add('hidden');
  if (saved) {
    enqueueDb(() => deleteSavedGame()); // uszkodzony zapis — usuwamy
  }
}

function resumeSavedGame() {
  if (state.screen !== 'start' || resumeCandidate === null) return;
  restoreState(resumeCandidate);
  updateResumeButton(null);
  dbOnline = true; // zapis wczytaliśmy, więc sesja gracza działa
  setSaveIndicator('');
  render();
  startCountdown();
}

// =====================================================================
// INICJALIZACJA
// =====================================================================

document.querySelectorAll('[data-level]').forEach(button => {
  button.addEventListener('click', () => startGame(button.dataset.level));
});

document.querySelectorAll('[data-board-level]').forEach(tab => {
  tab.addEventListener('click', () => showLeaderboardTab(tab.dataset.boardLevel));
});

document.getElementById('restart-button').addEventListener('click', goToStart);
document.addEventListener('keydown', handleKeydown);

resumeButton.addEventListener('click', resumeSavedGame);
document.getElementById('pause-resume-button').addEventListener('click', resumeGame);
document.getElementById('pause-exit-button').addEventListener('click', exitToMenu);

// Przełączenie karty lub zminimalizowanie okna = pauza z zapisem.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

initDb();
createBoard();
goToStart();
