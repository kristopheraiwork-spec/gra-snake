// Ładuje game.js w Node: atrapa DOM + atrapy funkcji z db.js.
// Obiekty z vm mają inny prototyp tablic — w testach porównuj przez JSON.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fakeElement() {
  return {
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {},
    style: {},
    textContent: '',
    value: '',
    className: '',
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren() { this.children = []; },
    addEventListener() {},
    focus() {},
  };
}

function loadGame() {
  const document = {
    hidden: false,
    getElementById: () => fakeElement(),
    querySelectorAll: () => [],
    createElement: () => fakeElement(),
    addEventListener() {},
  };
  const dbStubs = {
    initDb: () => false,
    getPlayerId: () => null,
    getStoredPlayer: async () => null,
    ensurePlayer: async () => false,
    saveGame: async () => false,
    loadSavedGame: async () => null,
    deleteSavedGame: async () => false,
    addScore: async () => false,
    getLeaderboard: async () => null,
    registerAccount: async () => ({ ok: false, reason: 'offline' }),
    signInAccount: async () => ({ ok: false, reason: 'offline' }),
    signOutAccount: async () => false,
    // logo.js
    startLogoAnimation: () => {},
    stopLogoAnimation: () => {},
    // background.js
    initBackground: () => {},
    setBackgroundCalm: () => {},
    // effects.js
    resetEffects: () => {},
    addSwallow: () => {},
    advanceSwallows: () => {},
    swallowIndexes: () => [],
    faceState: () => ({ blink: false, tongue: false }),
    playEatEffect: () => {},
    bumpScore: () => {},
    playCrashEffect: () => {},
    clearEffects: () => {},
  };
  const context = vm.createContext({
    document, console, setInterval, clearInterval, setTimeout, clearTimeout, ...dbStubs,
  });
  const code = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  vm.runInContext(
    code + '\n;globalThis.__game = { state, resetState, moveSnake, normalizeNick, normalizeLogin, isFruitAhead, toSavedGame, isValidSavedGame, restoreState };',
    context,
  );
  return context.__game;
}

module.exports = { loadGame };
