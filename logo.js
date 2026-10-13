// =====================================================================
// ANIMOWANA ILUSTRACJA EKRANU STARTOWEGO
// Wąż pełznie w stronę jabłka. Animacja działa tylko na ekranie startowym
// i wyłącza się, gdy system prosi o ograniczenie ruchu.
// =====================================================================

// Wymiary w jednostkach viewBox ilustracji (0 22 320 76 — przycięty do zasięgu ruchu).
const LOGO = {
  tailX: 18,       // koniec ogona
  neckX: 218,      // miejsce, w którym ciało chowa się pod głową
  baseY: 62,       // środkowa linia fali
  amplitude: 15,   // wysokość fali
  wavelength: 150, // długość fali
  speed: 2.4,      // prędkość fali (radiany na sekundę)
  minWidth: 2.5,   // grubość czubka ogona
  maxWidth: 17,    // grubość ciała przy szyi
  segments: 48,    // gładkość obrysu
  headOffset: 9,   // środek głowy przed szyją
  appleSway: 4,    // kołysanie jabłka (stopnie)
  leafSway: 9,     // kołysanie listka (stopnie)
};

// Punkty linii środkowej ciała w chwili t (s), od ogona do szyi.
// Fala płynie od głowy do ogona; przy szyi słabnie, żeby głowa tylko lekko się kołysała.
function bodyCenterline(t) {
  const points = [];
  for (let i = 0; i <= LOGO.segments; i++) {
    const fraction = i / LOGO.segments;
    const x = LOGO.tailX + (LOGO.neckX - LOGO.tailX) * fraction;
    const damping = 1 - 0.55 * fraction ** 3;
    const phase = (2 * Math.PI * x) / LOGO.wavelength + LOGO.speed * t;
    points.push({ x, y: LOGO.baseY + LOGO.amplitude * damping * Math.sin(phase) });
  }
  return points;
}

// Grubość ciała: 0 = czubek ogona, 1 = szyja.
function bodyWidth(fraction) {
  return LOGO.minWidth + (LOGO.maxWidth - LOGO.minWidth) * (1 - (1 - fraction) ** 2);
}

// Obrys zwężającego się ciała jako ścieżka SVG: jedna krawędź tam, druga z powrotem.
function bodyOutline(points) {
  const left = [];
  const right = [];
  points.forEach((point, i) => {
    const prev = points[Math.max(i - 1, 0)];
    const next = points[Math.min(i + 1, points.length - 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy);
    const half = bodyWidth(i / (points.length - 1)) / 2;
    const nx = (-dy / length) * half;
    const ny = (dx / length) * half;
    left.push(`${(point.x + nx).toFixed(1)} ${(point.y + ny).toFixed(1)}`);
    right.push(`${(point.x - nx).toFixed(1)} ${(point.y - ny).toFixed(1)}`);
  });
  return `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`;
}

// ---------- Rysowanie i pętla animacji ----------

let logoFrameId = null;
let logoStartTime = null;
let nextBlinkAt = 2; // pierwsze mrugnięcie po 2 s, nie od razu po wejściu

function logoElement(id) {
  return document.getElementById(id);
}

function isBlinking(t) {
  if (t >= nextBlinkAt + 0.14) {
    nextBlinkAt = t + 3 + Math.random() * 3; // kolejne mrugnięcie za 3–6 s
  }
  return t >= nextBlinkAt && t < nextBlinkAt + 0.14;
}

function drawLogo(t) {
  const points = bodyCenterline(t);
  const neck = points[points.length - 1];
  const appleAngle = LOGO.appleSway * Math.sin(t * 1.6);
  const leafAngle = LOGO.leafSway * Math.sin(t * 1.6 - 0.6);

  logoElement('logo-body').setAttribute('d', bodyOutline(points));
  logoElement('logo-head').setAttribute('transform', `translate(${neck.x + LOGO.headOffset} ${neck.y.toFixed(1)})`);
  logoElement('logo-eyes').setAttribute('transform', isBlinking(t) ? 'translate(0 -1) scale(1 0.15) translate(0 1)' : '');
  logoElement('logo-apple').setAttribute('transform', `translate(258 30) scale(1.9) rotate(${appleAngle.toFixed(2)} 12 21)`);
  logoElement('logo-leaf').setAttribute('transform', `rotate(${leafAngle.toFixed(2)} 13 5)`);
}

function logoFrame(timestamp) {
  if (logoStartTime === null) logoStartTime = timestamp;
  drawLogo((timestamp - logoStartTime) / 1000);
  logoFrameId = requestAnimationFrame(logoFrame);
}

function startLogoAnimation() {
  if (logoFrameId !== null) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawLogo(0); // nieruchomy wąż
    return;
  }
  logoFrameId = requestAnimationFrame(logoFrame);
}

function stopLogoAnimation() {
  cancelAnimationFrame(logoFrameId);
  logoFrameId = null;
}
