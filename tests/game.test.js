const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./load-game.js');

const game = loadGame();
const plain = value => JSON.parse(JSON.stringify(value));

function validSave(overrides = {}) {
  return {
    level: 'medium',
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }],
    fruit: { x: 3, y: 3 },
    direction: 'right',
    score: 1,
    ...overrides,
  };
}

function snakeWithHead(head) {
  return [head, { x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
}

test('normalizeNick: przycina spacje i sprawdza długość 3–16', () => {
  assert.equal(game.normalizeNick('  Ola  '), 'Ola');
  assert.equal(game.normalizeNick('Żółw'), 'Żółw');
  assert.equal(game.normalizeNick('abc'), 'abc');
  assert.equal(game.normalizeNick('a'.repeat(16)), 'a'.repeat(16));
  assert.equal(game.normalizeNick('ab'), null);
  assert.equal(game.normalizeNick('   ab   '), null);
  assert.equal(game.normalizeNick('a'.repeat(17)), null);
  assert.equal(game.normalizeNick(''), null);
  assert.equal(game.normalizeNick(undefined), null);
});

test('normalizeLogin: litery bez polskich znaków, cyfry, _ i -, małe litery', () => {
  assert.equal(game.normalizeLogin('ola'), 'ola');
  assert.equal(game.normalizeLogin('  Ola_K-1  '), 'ola_k-1');
  assert.equal(game.normalizeLogin('a'.repeat(16)), 'a'.repeat(16));
  assert.equal(game.normalizeLogin('ab'), null);
  assert.equal(game.normalizeLogin('a'.repeat(17)), null);
  assert.equal(game.normalizeLogin('żółw'), null);
  assert.equal(game.normalizeLogin('ola k'), null);
  assert.equal(game.normalizeLogin('ola@x'), null);
  assert.equal(game.normalizeLogin(''), null);
  assert.equal(game.normalizeLogin(null), null);
});

test('toSavedGame: kopiuje stan gry bez pendingDirection', () => {
  const state = {
    snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    fruit: { x: 1, y: 1 },
    direction: 'up',
    pendingDirection: 'left',
    score: 0,
    level: 'hard',
    screen: 'play',
  };
  const saved = game.toSavedGame(state);
  assert.deepEqual(plain(saved), {
    level: 'hard',
    snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    fruit: { x: 1, y: 1 },
    direction: 'up',
    score: 0,
  });
  state.snake[0].x = 99;
  state.fruit.x = 99;
  assert.equal(saved.snake[0].x, 5);
  assert.equal(saved.fruit.x, 1);
});

test('isValidSavedGame: akceptuje poprawny zapis', () => {
  assert.equal(game.isValidSavedGame(validSave()), true);
});

test('isValidSavedGame: zapis świeżej gry jest poprawny', () => {
  game.resetState('easy');
  assert.equal(game.isValidSavedGame(game.toSavedGame(game.state)), true);
});

test('isValidSavedGame: odrzuca uszkodzone i zmanipulowane zapisy', () => {
  const cases = {
    'brak zapisu': null,
    'nie obiekt': 'zapis',
    'nieznany poziom': validSave({ level: 'expert' }),
    'poziom z prototypu': validSave({ level: 'toString' }),
    'zły kierunek': validSave({ direction: 'diagonal' }),
    'wąż nie jest tablicą': validSave({ snake: 'x' }),
    'wąż za krótki': validSave({ snake: [{ x: 1, y: 1 }, { x: 2, y: 1 }], score: -1 }),
    'współrzędna poza planszą': validSave({ snake: snakeWithHead({ x: 20, y: 10 }) }),
    'współrzędna ujemna': validSave({ snake: snakeWithHead({ x: -1, y: 10 }) }),
    'współrzędna ułamkowa': validSave({ snake: snakeWithHead({ x: 1.5, y: 10 }) }),
    'współrzędna tekstem': validSave({ snake: snakeWithHead({ x: '10', y: 10 }) }),
    'segment null': validSave({ snake: snakeWithHead(null) }),
    'powtórzony segment': validSave({ snake: snakeWithHead({ x: 8, y: 10 }) }),
    'owoc na wężu': validSave({ fruit: { x: 9, y: 10 } }),
    'owoc poza planszą': validSave({ fruit: { x: 3, y: 20 } }),
    'brak owocu': validSave({ fruit: null }),
    'wynik niezgodny z długością': validSave({ score: 5 }),
  };
  for (const [name, saved] of Object.entries(cases)) {
    assert.equal(game.isValidSavedGame(saved), false, name);
  }
});

test('restoreState: odtwarza stan i gra toczy się dalej', () => {
  const saved = validSave({ direction: 'down' });
  game.restoreState(saved);
  assert.deepEqual(plain(game.state.snake), saved.snake);
  assert.deepEqual(plain(game.state.fruit), saved.fruit);
  assert.equal(game.state.direction, 'down');
  assert.equal(game.state.pendingDirection, null);
  assert.equal(game.state.score, 1);
  assert.equal(game.state.level, 'medium');

  saved.snake[0].x = 0;
  assert.equal(game.state.snake[0].x, 10, 'stan to kopia, nie referencja do zapisu');

  assert.equal(game.moveSnake(game.state), 'moved');
  assert.deepEqual(plain(game.state.snake[0]), { x: 10, y: 11 });
});
