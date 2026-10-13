// Świetliki w tle z background.js — geometria i tryb spokojny, bez DOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({ console });
const code = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
vm.runInContext(code + '\n;globalThis.__bg = { BACKGROUND, fireflyCount, createFirefly, stepFirefly, fireflyAlpha, approachCalm, calmFactors, hexToRgba };', context);
const bg = context.__bg;

test('fireflyCount: rośnie z wielkością okna, w granicach min–max', () => {
  assert.equal(bg.fireflyCount(320, 240), bg.BACKGROUND.minFireflies);
  assert.equal(bg.fireflyCount(5000, 5000), bg.BACKGROUND.maxFireflies);
  const medium = bg.fireflyCount(1200, 800);
  assert.ok(medium > bg.BACKGROUND.minFireflies && medium < bg.BACKGROUND.maxFireflies, `medium=${medium}`);
});

test('createFirefly: pozycja w oknie, rozmiar i prędkość w zakresie', () => {
  for (const r of [0, 0.5, 0.999]) {
    const f = bg.createFirefly(800, 600, () => r);
    assert.ok(f.x >= 0 && f.x <= 800 && f.y >= 0 && f.y <= 600);
    assert.ok(f.radius >= bg.BACKGROUND.minRadius && f.radius <= bg.BACKGROUND.maxRadius);
    assert.ok(f.speed >= bg.BACKGROUND.minSpeed && f.speed <= bg.BACKGROUND.maxSpeed);
  }
  assert.equal(bg.createFirefly(800, 600, () => 0).color, 'pink');
  assert.equal(bg.createFirefly(800, 600, () => 0.9).color, 'green');
});

test('stepFirefly: świetlik za krawędzią wraca z drugiej strony', () => {
  const f = bg.createFirefly(800, 600, () => 0.5);
  f.x = -100;
  f.y = 700;
  bg.stepFirefly(f, 0.016, 800, 600, 1);
  assert.ok(f.x > 800 - 1, `x=${f.x}`);
  assert.ok(f.y < 1, `y=${f.y}`);
});

test('stepFirefly: w trybie spokojnym świetlik przesuwa się wolniej', () => {
  const fast = bg.createFirefly(800, 600, () => 0.5);
  const slow = { ...fast };
  bg.stepFirefly(fast, 0.5, 800, 600, 1);
  bg.stepFirefly(slow, 0.5, 800, 600, 0.3);
  const startX = bg.createFirefly(800, 600, () => 0.5).x;
  const startY = bg.createFirefly(800, 600, () => 0.5).y;
  const distance = f => Math.hypot(f.x - startX, f.y - startY);
  assert.ok(distance(slow) < distance(fast));
});

test('fireflyAlpha: migotanie w granicach 0–1', () => {
  const f = bg.createFirefly(800, 600, () => 0.3);
  for (let t = 0; t < 10; t += 0.37) {
    const alpha = bg.fireflyAlpha(f, t);
    assert.ok(alpha > 0 && alpha <= 1, `alpha=${alpha}`);
  }
});

test('calmFactors: w grze ciemniej i wolniej, w menu pełny efekt', () => {
  const calm = bg.calmFactors(1);
  const full = bg.calmFactors(0);
  assert.equal(full.alpha, 1);
  assert.equal(full.speed, 1);
  assert.equal(calm.alpha, bg.BACKGROUND.calmAlpha);
  assert.equal(calm.speed, bg.BACKGROUND.calmSpeed);
});

test('hexToRgba: kolor z palety z przezroczystością', () => {
  assert.equal(bg.hexToRgba('#3ddc97', 0.35), 'rgba(61, 220, 151, 0.35)');
  assert.equal(bg.hexToRgba('#ff5e7a', 1), 'rgba(255, 94, 122, 1)');
});

test('approachCalm: przejście jest płynne i kończy się na celu', () => {
  const halfway = bg.approachCalm(0, 1, bg.BACKGROUND.transition / 2);
  assert.ok(halfway > 0.4 && halfway < 0.6, `halfway=${halfway}`);
  assert.equal(bg.approachCalm(0.9, 1, 1), 1);
  assert.equal(bg.approachCalm(0.1, 0, 1), 0);
});
