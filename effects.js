// =====================================================================
// ZABAWNE EFEKTY ROZGRYWKI
// Efekty na polach planszy to klasy CSS dodawane w render() (game.js).
// Efekty jednorazowe (okruszki, „+1”, gwiazdki) żyją na warstwie nad
// planszą i same znikają po zakończeniu animacji.
// =====================================================================

const EFFECTS = {
  crumbs: 6,                  // liczba okruszków po zjedzeniu jabłka
  crumbDistance: 26,          // jak daleko lecą okruszki (px)
  blinkEvery: [2500, 5000],   // odstęp między mrugnięciami (ms, losowo z zakresu)
  blinkLength: 160,           // czas mrugnięcia (ms)
  tongueEvery: [3000, 6000],  // odstęp między wysunięciami języka (ms)
  tongueLength: 350,          // jak długo język jest wysunięty (ms)
  lifetime: 900,              // po tym czasie efekt jednorazowy znika na pewno (ms)
};

// ---------- Stan efektów (bez dostępu do DOM) ----------

let swallows = [];  // indeksy segmentów z wybrzuszeniem po połkniętym jabłku
let nextHeadBlinkAt = 0;
let nextTongueAt = 0;

function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}

// Nowa gra: bez wybrzuszeń, mimika liczona od chwili „now” (ms).
function resetEffects(now) {
  swallows = [];
  nextHeadBlinkAt = now + randomBetween(EFFECTS.blinkEvery);
  nextTongueAt = now + randomBetween(EFFECTS.tongueEvery);
}

// Połknięte jabłko zaczyna się przy głowie.
function addSwallow() {
  swallows.push(0);
}

// Co ruch wybrzuszenia przesuwają się o segment; znikają za ogonem.
function advanceSwallows(snakeLength) {
  swallows = swallows.map(index => index + 1).filter(index => index < snakeLength);
}

function swallowIndexes() {
  return swallows;
}

// Czy wąż właśnie mruga i czy ma wysunięty język (now w ms).
function faceState(now) {
  if (now >= nextHeadBlinkAt + EFFECTS.blinkLength) {
    nextHeadBlinkAt = now + randomBetween(EFFECTS.blinkEvery);
  }
  if (now >= nextTongueAt + EFFECTS.tongueLength) {
    nextTongueAt = now + randomBetween(EFFECTS.tongueEvery);
  }
  return { blink: now >= nextHeadBlinkAt, tongue: now >= nextTongueAt };
}

// ---------- Efekty jednorazowe na warstwie nad planszą ----------

function effectsLayer() {
  return document.getElementById('effects');
}

// Element efektu na środku podanej komórki planszy. Znika po swojej animacji,
// a najpóźniej po EFFECTS.lifetime — także gdy animacje są wyłączone („ogranicz ruch”).
// Efekt trwały (temporary = false) usuwa dopiero clearEffects().
function spawnEffect(cell, className, text = '', temporary = true) {
  const element = document.createElement('div');
  element.className = `fx ${className}`;
  element.textContent = text;
  element.style.left = `${cell.offsetLeft + cell.offsetWidth / 2}px`;
  element.style.top = `${cell.offsetTop + cell.offsetHeight / 2}px`;
  if (temporary) {
    element.addEventListener('animationend', () => element.remove());
    setTimeout(() => element.remove(), EFFECTS.lifetime);
  }
  effectsLayer().appendChild(element);
  return element;
}

// „Mniam!”: okruszki jabłka rozpryskują się, a nad głową wyskakuje „+1”.
function playEatEffect(cell) {
  for (let i = 0; i < EFFECTS.crumbs; i++) {
    const angle = (2 * Math.PI * i) / EFFECTS.crumbs + Math.random() * 0.5;
    const crumb = spawnEffect(cell, 'fx-crumb');
    crumb.style.setProperty('--dx', `${(Math.cos(angle) * EFFECTS.crumbDistance).toFixed(1)}px`);
    crumb.style.setProperty('--dy', `${(Math.sin(angle) * EFFECTS.crumbDistance).toFixed(1)}px`);
  }
  spawnEffect(cell, 'fx-plus', '+1');
}

// Licznik punktów podskakuje (ponowne dodanie klasy restartuje animację).
function bumpScore(scoreElement) {
  scoreElement.classList.remove('bump');
  void scoreElement.offsetWidth;
  scoreElement.classList.add('bump');
}

// Kolizja: gwiazdki krążą nad głową, wąż się trzęsie (klasa planszy).
function playCrashEffect(cell, boardElement) {
  const stars = spawnEffect(cell, 'fx-stars', '', false);
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.textContent = '★';
    star.style.setProperty('--i', i);
    stars.appendChild(star);
  }
  boardElement.classList.add('crashing');
}

function clearEffects(boardElement) {
  effectsLayer().replaceChildren();
  boardElement.classList.remove('crashing');
}
