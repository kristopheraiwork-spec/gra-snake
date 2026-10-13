// Stan efektów z effects.js (wybrzuszenia, mimika) — bez DOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadEffects() {
  const context = vm.createContext({ console });
  vm.runInContext('Math.random = () => 0;', context); // przewidywalne odstępy
  const code = fs.readFileSync(path.join(__dirname, '..', 'effects.js'), 'utf8');
  vm.runInContext(code + '\n;globalThis.__fx = { EFFECTS, addSwallow, advanceSwallows, swallowIndexes, resetEffects, faceState };', context);
  return context.__fx;
}

const plain = value => JSON.parse(JSON.stringify(value));

test('wybrzuszenie przesuwa się co ruch i znika za ogonem', () => {
  const fx = loadEffects();
  fx.resetEffects(0);
  fx.addSwallow();
  assert.deepEqual(plain(fx.swallowIndexes()), [0]);
  fx.advanceSwallows(3);
  fx.advanceSwallows(3);
  assert.deepEqual(plain(fx.swallowIndexes()), [2]);
  fx.advanceSwallows(3);
  assert.deepEqual(plain(fx.swallowIndexes()), []);
});

test('kilka połkniętych jabłek to kilka wybrzuszeń naraz', () => {
  const fx = loadEffects();
  fx.resetEffects(0);
  fx.addSwallow();
  fx.advanceSwallows(10);
  fx.advanceSwallows(10);
  fx.addSwallow();
  assert.deepEqual(plain(fx.swallowIndexes()), [2, 0]);
});

test('resetEffects czyści wybrzuszenia', () => {
  const fx = loadEffects();
  fx.addSwallow();
  fx.resetEffects(0);
  assert.deepEqual(plain(fx.swallowIndexes()), []);
});

test('mruganie: krótko, w wyznaczonym momencie, potem kolejny termin', () => {
  const fx = loadEffects();
  fx.resetEffects(0);
  const first = fx.EFFECTS.blinkEvery[0];
  assert.equal(fx.faceState(first - 1).blink, false);
  assert.equal(fx.faceState(first + 10).blink, true);
  assert.equal(fx.faceState(first + fx.EFFECTS.blinkLength + 10).blink, false);
});

test('język: wysuwa się w wyznaczonym momencie i chowa po chwili', () => {
  const fx = loadEffects();
  fx.resetEffects(0);
  const first = fx.EFFECTS.tongueEvery[0];
  assert.equal(fx.faceState(first - 1).tongue, false);
  assert.equal(fx.faceState(first + 10).tongue, true);
  assert.equal(fx.faceState(first + fx.EFFECTS.tongueLength + 10).tongue, false);
});
