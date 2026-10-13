// Geometria animowanego węża z logo.js — bez DOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({ console });
const code = fs.readFileSync(path.join(__dirname, '..', 'logo.js'), 'utf8');
vm.runInContext(code + '\n;globalThis.__logo = { LOGO, bodyCenterline, bodyWidth, bodyOutline };', context);
const { LOGO, bodyCenterline, bodyWidth, bodyOutline } = context.__logo;

test('bodyCenterline: punkty od ogona do szyi w granicach fali', () => {
  const points = bodyCenterline(0);
  assert.equal(points.length, LOGO.segments + 1);
  assert.equal(points[0].x, LOGO.tailX);
  assert.equal(points[points.length - 1].x, LOGO.neckX);
  for (const p of points) {
    assert.ok(Math.abs(p.y - LOGO.baseY) <= LOGO.amplitude + 1e-9, `y=${p.y} poza falą`);
  }
});

test('bodyCenterline: fala się przesuwa w czasie', () => {
  const now = bodyCenterline(0);
  const later = bodyCenterline(0.5);
  assert.ok(now.some((p, i) => Math.abs(p.y - later[i].y) > 1), 'kształt ciała się nie zmienia');
});

test('bodyWidth: ciało zwęża się od szyi do cienkiego ogona', () => {
  assert.equal(bodyWidth(0), LOGO.minWidth);
  assert.equal(bodyWidth(1), LOGO.maxWidth);
  for (let step = 0; step < 10; step++) {
    assert.ok(bodyWidth((step + 1) / 10) >= bodyWidth(step / 10), `szerokość maleje przy f=${step / 10}`);
  }
});

test('bodyOutline: zamknięta ścieżka SVG z poprawnymi liczbami', () => {
  const d = bodyOutline(bodyCenterline(1.3));
  assert.match(d, /^M /);
  assert.match(d, /Z$/);
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  assert.equal(numbers.length, 2 * 2 * (LOGO.segments + 1), 'po dwie krawędzie, po dwie współrzędne');
  assert.ok(numbers.every(Number.isFinite));
});
