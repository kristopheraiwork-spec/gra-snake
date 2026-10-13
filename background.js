// =====================================================================
// TŁO ZE ŚWIETLIKAMI
// Drobne, rozmyte punkty w kolorach gry dryfują i migoczą za całą stroną.
// Podczas rozgrywki płynnie przygasają i zwalniają (tryb spokojny).
// =====================================================================

const BACKGROUND = {
  areaPerFirefly: 18000, // jeden świetlik na tyle px² okna
  minFireflies: 20,
  maxFireflies: 80,
  pinkShare: 0.2,        // co piąty świetlik jest różowy
  minRadius: 1,          // promień jasnego środka (px)
  maxRadius: 2,
  glowScale: 8,          // średnica poświaty = promień × glowScale
  minSpeed: 6,           // prędkość dryfu (px/s)
  maxSpeed: 16,
  calmAlpha: 0.35,       // jasność w trybie spokojnym
  calmSpeed: 0.3,        // prędkość w trybie spokojnym
  transition: 0.6,       // czas przejścia między trybami (s)
};

// ---------- Ruch świetlików (bez dostępu do DOM) ----------

function fireflyCount(width, height) {
  const count = Math.round((width * height) / BACKGROUND.areaPerFirefly);
  return Math.min(BACKGROUND.maxFireflies, Math.max(BACKGROUND.minFireflies, count));
}

function between(min, max, random) {
  return min + random() * (max - min);
}

function createFirefly(width, height, random = Math.random) {
  return {
    x: random() * width,
    y: random() * height,
    radius: between(BACKGROUND.minRadius, BACKGROUND.maxRadius, random),
    speed: between(BACKGROUND.minSpeed, BACKGROUND.maxSpeed, random),
    angle: random() * 2 * Math.PI,       // główny kierunek dryfu
    wanderPhase: random() * 2 * Math.PI, // nieregularne „falowanie” toru
    twinklePhase: random() * 2 * Math.PI,
    twinkleSpeed: between(0.8, 2.2, random),
    color: random() < BACKGROUND.pinkShare ? 'pink' : 'green',
  };
}

// Przesuwa świetlik o dt sekund; za krawędzią wraca z drugiej strony.
function stepFirefly(firefly, dt, width, height, speedFactor) {
  firefly.wanderPhase += dt * 0.7;
  const direction = firefly.angle + 0.6 * Math.sin(firefly.wanderPhase);
  const distance = firefly.speed * speedFactor * dt;
  firefly.x += Math.cos(direction) * distance;
  firefly.y += Math.sin(direction) * distance;

  const margin = firefly.radius * BACKGROUND.glowScale / 2;
  if (firefly.x < -margin) firefly.x = width + margin;
  if (firefly.x > width + margin) firefly.x = -margin;
  if (firefly.y < -margin) firefly.y = height + margin;
  if (firefly.y > height + margin) firefly.y = -margin;
}

// Migotanie: jasność 0.35–1 w rytmie właściwym dla każdego świetlika.
function fireflyAlpha(firefly, t) {
  return 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(firefly.twinklePhase + t * firefly.twinkleSpeed));
}

// Płynne przejście trybu: calmness 0 = pełny efekt, 1 = tryb spokojny.
function approachCalm(current, target, dt) {
  const step = dt / BACKGROUND.transition;
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

// Mieszanka pełnego efektu (1) i trybu spokojnego według calmness.
// Kolor z palety (#rrggbb) z przezroczystością — dla gradientu poświaty.
function hexToRgba(hex, alpha) {
  const value = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function calmFactors(calmness) {
  return {
    alpha: (1 - calmness) + BACKGROUND.calmAlpha * calmness,
    speed: (1 - calmness) + BACKGROUND.calmSpeed * calmness,
  };
}

// ---------- Rysowanie na canvas ----------

let bgCanvas = null;
let bgContext = null;
let bgWidth = 0;
let bgHeight = 0;
let fireflies = [];
let glowSprites = {};
let calmTarget = 0;
let calmness = 0;
let bgTime = 0;
let bgLastTimestamp = null;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Poświata rysowana raz do bufora — w każdej klatce tylko ją kopiujemy.
function createGlowSprite(color) {
  const size = 64;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const context = sprite.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, hexToRgba(color, 1));
  gradient.addColorStop(0.2, hexToRgba(color, 1));
  gradient.addColorStop(0.45, hexToRgba(color, 0.35));
  gradient.addColorStop(1, hexToRgba(color, 0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return sprite;
}

function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Dopasowuje canvas do okna (ostro także na ekranach o dużej gęstości pikseli).
function resizeBackground() {
  const ratio = window.devicePixelRatio || 1;
  bgWidth = window.innerWidth;
  bgHeight = window.innerHeight;
  bgCanvas.width = Math.round(bgWidth * ratio);
  bgCanvas.height = Math.round(bgHeight * ratio);
  bgContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = fireflyCount(bgWidth, bgHeight);
  while (fireflies.length < count) fireflies.push(createFirefly(bgWidth, bgHeight));
  fireflies.length = count;
  drawBackground();
}

function drawBackground() {
  const { alpha } = calmFactors(calmness);
  bgContext.clearRect(0, 0, bgWidth, bgHeight);
  fireflies.forEach(firefly => {
    const size = firefly.radius * BACKGROUND.glowScale;
    bgContext.globalAlpha = alpha * fireflyAlpha(firefly, bgTime);
    bgContext.drawImage(glowSprites[firefly.color], firefly.x - size / 2, firefly.y - size / 2, size, size);
  });
  bgContext.globalAlpha = 1;
}

function backgroundFrame(timestamp) {
  const dt = bgLastTimestamp === null ? 0 : Math.min(0.05, (timestamp - bgLastTimestamp) / 1000);
  bgLastTimestamp = timestamp;
  calmness = approachCalm(calmness, calmTarget, dt);
  const { speed } = calmFactors(calmness);
  fireflies.forEach(firefly => stepFirefly(firefly, dt, bgWidth, bgHeight, speed));
  bgTime += dt * speed;
  drawBackground();
  requestAnimationFrame(backgroundFrame);
}

function initBackground() {
  bgCanvas = document.getElementById('background');
  if (!bgCanvas || !bgCanvas.getContext) return;
  bgContext = bgCanvas.getContext('2d');
  glowSprites = { green: createGlowSprite(cssColor('--accent')), pink: createGlowSprite(cssColor('--fruit')) };
  resizeBackground();
  window.addEventListener('resize', resizeBackground);
  if (!prefersReducedMotion()) {
    requestAnimationFrame(backgroundFrame); // karta w tle — przeglądarka sama wstrzymuje
  }
}

// Tryb spokojny podczas rozgrywki: ciemniej i wolniej.
function setBackgroundCalm(isCalm) {
  calmTarget = isCalm ? 1 : 0;
  if (bgContext && prefersReducedMotion()) {
    calmness = calmTarget; // bez animacji przejścia
    drawBackground();
  }
}
