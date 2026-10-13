# Ranking, wznawianie gry i opcjonalne konta (Supabase) — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gra „Wężoidy” zapisuje wyniki do wspólnego rankingu (top 10 na poziom), pozwala wznowić przerwaną rozgrywkę i założyć opcjonalne konto (login + hasło) — dane w Supabase.

**Architecture:** Nowy plik `db.js` zamyka całą komunikację z Supabase w funkcjach, które nigdy nie rzucają wyjątków (zwracają wynik albo `null`/`false`/`{ok:false}`). `game.js` dostaje czyste funkcje zapisu stanu i walidacji loginu (testowane w Node), a operacje bazodanowe wykonuje w tle przez jedną kolejkę (`enqueueDb`), żeby zapisy i usunięcia nie wyprzedzały się nawzajem. Pauza i odliczanie to nakładki na planszę w ekranie rozgrywki. Konta to adresy techniczne `<login>@wezoidy.local`; flagę konta (`has_account`) ustawia wyłącznie wyzwalacz w bazie.

**Tech Stack:** HTML + CSS + JavaScript (ES6+, bez modułów), `supabase-js@2` z cdn.jsdelivr.net, Supabase (Postgres + RLS + anonimowe logowanie), testy: `node:test` (Node 22) + headless Chrome.

**Spec:** `docs/superpowers/specs/2026-10-13-supabase-wyniki-wznowienie-design.md`

## Global Constraints

- Projekt Supabase: `https://geudeqgbhjrlnuzantvh.supabase.co`; klucz publiczny: `sb_publishable_AQdcMJa_MDniVulQEN1ShQ_jrp3mKHD` (nigdy `secret` / `service_role`).
- Baza jest już wgrana (`supabase/schema.sql`) i przetestowana (28/28); logowanie anonimowe włączone; „Confirm email” wyłączone. Schemat zmienia wyłącznie migracja `supabase/konta.sql` z Task 2 (uruchamia ją użytkownik w SQL Editor).
- Konta: login 3–16 znaków `[a-zA-Z0-9_-]`, zapisywany małymi literami; adres techniczny `<login>@wezoidy.local`; hasło min. 6 znaków (`PASSWORD_MIN = 6`); nick konta = login, w rankingu z sufiksem ` ✓`.
- Biblioteka: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`; jedyna zależność zewnętrzna. Bez `package.json`, bez modułów ES (gra musi działać z `file://`).
- Nick: 3–16 znaków po przycięciu spacji; nicki mogą się powtarzać.
- Poziomy: `easy` / `medium` / `hard`; kierunki: `up` / `down` / `left` / `right`; plansza 20 × 20; wynik 0–397; w zapisie gry `score = snake.length - 3`.
- Automatyczny zapis co **5 s**; odliczanie **3‑2‑1** (co 1 s); ranking **top 10 per poziom**.
- Logika ruchu i kolizji w `game.js` (sekcja 4) pozostaje bez zmian. Funkcje sekcji 4 i 4a nie dotykają DOM.
- Nicki innych graczy wstawiane do strony wyłącznie przez `textContent` — nigdy `innerHTML`.
- Gra zawsze działa bez bazy: żaden błąd sieci/Supabase nie zatrzymuje rozgrywki ani nie powoduje nieobsłużonego błędu JS.
- Teksty interfejsu po polsku, dokładnie jak w zadaniach (np. „Ranking niedostępny – brak połączenia”).
- Commity kończą się linią: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Wyścig autozapisu z końcem gry** — zapis wysłany tuż przed kolizją kończy się po usunięciu zapisu i „wskrzesza” grę do wznowienia. Oczekiwane: po końcu gry zapisu nie ma (kolejka `enqueueDb`; test e2e w Zadaniu 5: `saveAfterEnd=null`).
2. **Nick z HTML od innego gracza** (np. `<b>x</b>`, `<img onerror=…>`) w rankingu — oczekiwane: wyświetlony dosłownie jako tekst (test e2e w Zadaniu 4: `xss=true`).
3. **Wpisywanie nicku zawierającego w/a/s/d/p/spację** — oczekiwane: znaki trafiają do pola, gra nie startuje ani nie reaguje; tylko Enter startuje (test e2e w Zadaniu 4: `typingScreen=start`).
4. **Zmanipulowany lub uszkodzony zapis gry w bazie** (współrzędne poza planszą, tekst zamiast liczby, owoc na wężu, poziom `toString`) — oczekiwane: brak przycisku „Wznów”, zapis usunięty, gra się nie wiesza (testy `isValidSavedGame` w Zadaniu 1).
5. **Nick i login: spacje na brzegach, polskie znaki, wielkie litery, długość 16 vs 17** — oczekiwane: nick przycięty, polskie znaki w nicku dozwolone; login z polskimi znakami odrzucony z czytelnym komunikatem, wielkie litery zamienione na małe; 17 znaków odrzucone przed wysłaniem do bazy (testy `normalizeNick` i `normalizeLogin` w Zadaniu 1).
6. **Założenie konta w trakcie gry bez konta** — oczekiwane: dotychczasowe wyniki zostają i od razu mają ✓ w rankingu (test e2e w Zadaniu 6: `ownCheck=true`).

---

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `db.js` (nowy) | Konfiguracja Supabase i funkcje dostępu do bazy oraz kont; zero wiedzy o DOM i zasadach gry |
| `supabase/konta.sql` (nowy) | migracja kont: `has_account`, wyzwalacz, indeks, RLS nicku, widok rankingu |
| `game.js` | + sekcja 4a (zapis stanu, bez DOM), rozszerzenia sekcji 1, 2, 5, 6, 7, nowa sekcja 8 (baza w tle, pauza, wznawianie) |
| `index.html` | skrypt CDN, `db.js`, pole nicku, ranking, przycisk „Wznów”, nakładki pauzy i odliczania |
| `style.css` | style nowych elementów w obecnej palecie |
| `tests/load-game.js` (nowy) | ładuje `game.js` w Node z atrapą DOM i atrapami `db.js` |
| `tests/game.test.js` (nowy) | testy funkcji sekcji 4a |
| `supabase/test-rls.mjs` (nowy) | test reguł RLS na prawdziwym projekcie (skopiowany z sesji) |
| `wymagania.md` | aktualizacja zakresu, sterowania, ekranów, struktury, kryteriów |

Pliki pomocnicze testów e2e (nie commitowane) leżą w katalogu tymczasowym sesji, dalej `$S`:
`S="C:/Users/KRZYSZ~1.STO/AppData/Local/Temp/claude/C--VS-katalogi-Szkolenia-Vibe-dzie--3/d6617fff-5a57-4654-a69f-e82f18196d63/scratchpad"`
Katalog projektu dalej `$P`: `P="/c/VS katalogi/Szkolenia Vibe/dzień 3"`. Chrome: `"/c/Program Files/Google/Chrome/Application/chrome.exe"`.

---

### Task 1: Funkcje zapisu stanu gry (bez DOM) + testy w Node

**Files:**
- Create: `tests/load-game.js`, `tests/game.test.js`
- Modify: `game.js` — sekcja 1 (stałe), nowa sekcja 4a po sekcji 4 (przed `// 5. OBSŁUGA KLAWIATURY`)

**Interfaces:**
- Consumes: istniejące `state`, `LEVELS`, `DIRECTIONS`, `BOARD_SIZE`, `INITIAL_LENGTH`, `samePosition`, `resetState`, `moveSnake`.
- Produces:
  - `normalizeNick(raw: any): string | null` — przycięty nick lub `null`, gdy długość poza 3–16 albo nie string.
  - `toSavedGame(game): {level, snake: {x,y}[], fruit: {x,y}, direction, score}` — głęboka kopia, bez `pendingDirection`.
  - `isValidSavedGame(saved: any): boolean`.
  - `restoreState(saved): void` — ustawia `state` z zapisu (kopie), `pendingDirection = null`.
  - `normalizeLogin(raw: any): string | null` — przycięty login małymi literami albo `null`, gdy niezgodny z `LOGIN_PATTERN`.
  - Stałe: `NICK_MIN = 3`, `NICK_MAX = 16`, `PASSWORD_MIN = 6`, `LOGIN_PATTERN = /^[a-z0-9_-]{3,16}$/`, `AUTOSAVE_INTERVAL = 5000`, `COUNTDOWN_FROM = 3`.
  - Atrapy w `tests/load-game.js` — nazwy funkcji `db.js` używane przez kolejne zadania.

- [ ] **Step 1: Utwórz loader testów `tests/load-game.js`**

```js
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
  };
  const context = vm.createContext({
    document, console, setInterval, clearInterval, setTimeout, clearTimeout, ...dbStubs,
  });
  const code = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  vm.runInContext(
    code + '\n;globalThis.__game = { state, resetState, moveSnake, normalizeNick, normalizeLogin, toSavedGame, isValidSavedGame, restoreState };',
    context,
  );
  return context.__game;
}

module.exports = { loadGame };
```

- [ ] **Step 2: Napisz testy `tests/game.test.js`**

```js
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
```

- [ ] **Step 3: Uruchom testy — mają nie przejść**

Run: `cd "$P" && node --test "tests/*.test.js"`
Expected: FAIL — `ReferenceError: normalizeNick is not defined` (eksport w loaderze odwołuje się do nieistniejących funkcji).

- [ ] **Step 4: Dodaj stałe w sekcji 1 `game.js`** (pod `const INITIAL_LENGTH = 3;`)

```js
const NICK_MIN = 3;
const NICK_MAX = 16;
const PASSWORD_MIN = 6;
const LOGIN_PATTERN = /^[a-z0-9_-]{3,16}$/; // login trafia do adresu e-mail, więc tylko ASCII
const AUTOSAVE_INTERVAL = 5000; // ms między automatycznymi zapisami gry
const COUNTDOWN_FROM = 3;       // odliczanie przed wznowieniem gry
```

- [ ] **Step 5: Dodaj sekcję 4a w `game.js`** (po funkcji `moveSnake`, przed nagłówkiem sekcji 5)

```js
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
```

- [ ] **Step 6: Uruchom testy — mają przejść**

Run: `cd "$P" && node --test "tests/*.test.js"`
Expected: PASS — 7 testów, 0 fail.

- [ ] **Step 7: Commit**

```bash
cd "$P" && git add game.js tests/ && git commit -m "Funkcje zapisu stanu gry (nick, login, zapis, walidacja, odtworzenie) z testami

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migracja kont w bazie + rozszerzony test RLS

**Files:**
- Create: `supabase/konta.sql`, `supabase/test-rls.mjs` (kopia `$S/rls-test.mjs` + przypadki kont)

**Interfaces:**
- Consumes: istniejący schemat (`schema.sql`), konto testowe `test-konto` założone w teście wstępnym.
- Produces: kolumna `players.has_account`, kolumna `leaderboard.has_account`, wyzwalacz `on_auth_user_account`; klient nadal ma uprawnienia tylko do `players(id, nick)`.

- [ ] **Step 1: Utwórz `supabase/test-rls.mjs` z przypadkami kont**

Skopiuj `$S/rls-test.mjs` do `supabase/test-rls.mjs`, a przed ostatnią linią (`console.log(\`\nWYNIK: ...`) wstaw:

```js
// --- konta (migracja konta.sql) ---
const login = 'test-rls-' + Math.random().toString(36).slice(2, 7);
const C = await signIn();
r = await rest('players', { method: 'POST', token: C.token, body: { nick: 'test-c', has_account: true } });
check('C: nie ustawi has_account przy dodaniu', !ok2xx(r), JSON.stringify(r));
r = await rest('players', { method: 'POST', token: C.token, body: { nick: 'test-c' } });
check('C: utworzenie gracza bez konta', ok2xx(r), JSON.stringify(r));
r = await rest('players?id=eq.' + C.id, { method: 'PATCH', token: C.token, body: { has_account: true } });
check('C: nie ustawi has_account zmianą', !ok2xx(r), JSON.stringify(r));
r = await rest('scores', { method: 'POST', token: C.token, body: { level: 'hard', score: 0 } });
check('C: wynik przed założeniem konta', ok2xx(r), JSON.stringify(r));
const conv = await fetch(URL + '/auth/v1/user', {
  method: 'PUT',
  headers: { apikey: KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + C.token },
  body: JSON.stringify({ email: login + '@wezoidy.local', password: 'Haslo-' + login }),
});
check('C: zamiana sesji w konto', conv.status === 200, String(conv.status));
r = await rest('players?select=nick,has_account&id=eq.' + C.id, { token: C.token });
check('wyzwalacz: has_account=true i nick=login', Array.isArray(r.data) && r.data[0]?.has_account === true && r.data[0]?.nick === login, JSON.stringify(r));
r = await rest('players?id=eq.' + C.id, { method: 'PATCH', token: C.token, prefer: 'return=representation', body: { nick: 'inny-nick' } });
check('konto: nie zmieni nicku', Array.isArray(r.data) && r.data.length === 0, JSON.stringify(r));
r = await rest('leaderboard?select=nick,has_account&level=eq.hard&player_id=eq.' + C.id);
check('ranking: konto z has_account=true', Array.isArray(r.data) && r.data[0]?.has_account === true && r.data[0]?.nick === login, JSON.stringify(r));
r = await rest('players', { method: 'POST', token: (await signIn()).token, body: { nick: login } });
check('gracz bez konta może mieć nick konta', ok2xx(r), JSON.stringify(r));
```

- [ ] **Step 2: Uruchom test — część kont ma nie przejść**

Run: `cd "$P" && node supabase/test-rls.mjs`
Expected: 28 dotychczasowych PASS; FAIL m.in. `wyzwalacz: has_account=true i nick=login` i `ranking: konto z has_account=true` (kolumna i wyzwalacz nie istnieją).

- [ ] **Step 3: Utwórz `supabase/konta.sql`**

```sql
-- =====================================================================
-- Wężoidy — migracja: opcjonalne konta (login + hasło)
-- Uruchomić po schema.sql. Projekt: spec, sekcja 8.
-- =====================================================================

-- Flagę konta ustawia wyłącznie wyzwalacz poniżej; klient nie ma do niej uprawnień.
alter table public.players add column has_account boolean not null default false;

-- Nick unikalny tylko wśród kont — gracz bez konta może mieć taki sam.
create unique index players_account_nick_idx on public.players (lower(nick)) where has_account;

-- Konto = użytkownik nieanonimowy z adresem <login>@wezoidy.local; nick = login.
create function public.sync_account_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_anonymous or new.email is null or new.email not like '%@wezoidy.local' then
    return new;
  end if;
  insert into public.players (id, nick, has_account)
  values (new.id, split_part(new.email, '@', 1), true)
  on conflict (id) do update set nick = excluded.nick, has_account = true;
  return new;
end;
$$;

create trigger on_auth_user_account
  after insert or update of email, is_anonymous on auth.users
  for each row execute function public.sync_account_player();

-- Konta założone przed migracją (np. test-konto).
update public.players p
set nick = split_part(u.email, '@', 1), has_account = true
from auth.users u
where u.id = p.id and not u.is_anonymous and u.email like '%@wezoidy.local';

-- Nick może zmienić tylko gracz bez konta (konto nie podszyje się pod inną nazwę).
drop policy "players: zmiana własnego nicku" on public.players;

create policy "players: zmiana własnego nicku (bez konta)"
  on public.players for update
  to authenticated
  using (id = (select auth.uid()) and not has_account)
  with check (id = (select auth.uid()) and not has_account);

-- Ranking z informacją o koncie (nowa kolumna na końcu).
create or replace view public.leaderboard
with (security_invoker = true) as
with best as (
  select distinct on (s.level, s.player_id)
    s.level, s.player_id, s.score, s.created_at
  from public.scores s
  order by s.level, s.player_id, s.score desc, s.created_at asc
),
ranked as (
  select
    b.*,
    row_number() over (partition by b.level order by b.score desc, b.created_at asc) as position
  from best b
)
select r.level, r.position, p.nick, r.score, r.created_at, r.player_id, p.has_account
from ranked r
join public.players p on p.id = r.player_id
where r.position <= 10;
```

- [ ] **Step 4: Użytkownik uruchamia migrację**

Poproś użytkownika: SQL Editor → wklej całą zawartość `supabase/konta.sql` → Run; oczekiwane „Success. No rows returned”. Poczekaj na potwierdzenie.

- [ ] **Step 5: Uruchom test — ma przejść**

Run: `cd "$P" && node supabase/test-rls.mjs | tail -12`
Expected: `WYNIK: 38 PASS, 0 FAIL`.
(Jeśli `ranking: konto z has_account=true` nie przejdzie, bo na poziomie Trudnym jest już 10 lepszych graczy — zmień w teście wynik C na wyższy, np. 300, i uruchom ponownie.)

- [ ] **Step 6: Commit**

```bash
cd "$P" && git add supabase/konta.sql supabase/test-rls.mjs && git commit -m "Migracja kont (login + hasło) i test reguł RLS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Warstwa bazy `db.js` + podpięcie biblioteki

**Files:**
- Create: `db.js`
- Modify: `index.html` — przed `<script src="game.js"></script>`
- Pomocnicze (bez commita): `$S/make-harness.mjs`, `$S/smoke.js`

**Interfaces:**
- Consumes: globalny `window.supabase` z CDN.
- Produces (globalne funkcje, żadna nie rzuca wyjątku):
  - `initDb(): boolean`
  - `getPlayerId(): string | null`
  - `getStoredPlayer(): Promise<{id, nick, has_account} | null>` — ustawia `playerId`, gdy gracz istnieje.
  - `ensurePlayer(nick: string): Promise<boolean>` — loguje anonimowo w razie potrzeby, tworzy gracza lub aktualizuje nick (nicku konta nie zmienia).
  - `registerAccount(login: string, password: string): Promise<{ok: true} | {ok: false, reason: 'taken'|'weak-password'|'offline'|'error'}>` — przy sesji anonimowej zamienia ją w konto.
  - `signInAccount(login: string, password: string): Promise<{ok: true} | {ok: false, reason: 'invalid'|'offline'|'error'}>`
  - `signOutAccount(): Promise<boolean>`
  - `saveGame(snapshot): Promise<boolean>` — upsert do `saved_games`.
  - `loadSavedGame(): Promise<{level, snake, fruit, direction, score} | null>`
  - `deleteSavedGame(): Promise<boolean>`
  - `addScore(level: string, score: number): Promise<boolean>`
  - `getLeaderboard(level: string): Promise<{position, nick, score, player_id, has_account}[] | null>` — `null` = brak połączenia.

- [ ] **Step 1: Utwórz generator stron testowych `$S/make-harness.mjs`**

```js
// Użycie: node make-harness.mjs <katalog-projektu> <scenariusz.js> <wyjście.html> [--offline]
// Kopiuje index.html z bezwzględnymi ścieżkami, dokleja przechwytywanie błędów i scenariusz.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [project, scenario, out, flag] = process.argv.slice(2);
const base = pathToFileURL(path.resolve(project)).href + '/';
let html = fs.readFileSync(path.join(project, 'index.html'), 'utf8')
  .replace('href="style.css"', `href="${base}style.css"`)
  .replace('src="db.js"', `src="${base}db.js"`)
  .replace('src="game.js"', `src="${base}game.js"`);
if (flag === '--offline') {
  html = html.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/, '<script src="https://invalid.invalid/supabase.js"></script>');
}
const errorHook = '<script>window.__errors=[];'
  + 'addEventListener("error",e=>{if(e.message)__errors.push(e.message)});'
  + 'addEventListener("unhandledrejection",e=>__errors.push(String(e.reason)));</script>';
html = html
  .replace('<head>', '<head>' + errorHook)
  .replace('</body>', `<script>${fs.readFileSync(scenario, 'utf8')}</script></body>`);
fs.writeFileSync(out, html);
```

- [ ] **Step 2: Napisz scenariusz testu dymnego `$S/smoke.js`**

```js
(async () => {
  const out = [];
  out.push('init=' + initDb());
  out.push('storedBefore=' + JSON.stringify(await getStoredPlayer()));
  out.push('ensure=' + await ensurePlayer('test-smoke'));
  out.push('hasId=' + (getPlayerId() !== null));
  const snap = { level: 'easy', snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }], fruit: { x: 9, y: 9 }, direction: 'right', score: 0 };
  out.push('save=' + await saveGame(snap));
  out.push('resave=' + await saveGame({ ...snap, direction: 'up' }));
  const loaded = await loadSavedGame();
  out.push('loadDir=' + (loaded && loaded.direction));
  out.push('delete=' + await deleteSavedGame());
  out.push('loadAfterDelete=' + JSON.stringify(await loadSavedGame()));
  out.push('score=' + await addScore('easy', 0));
  const rows = await getLeaderboard('easy');
  out.push('inBoard=' + (Array.isArray(rows) && rows.some(r => r.player_id === getPlayerId())));
  out.push('storedAfter=' + ((await getStoredPlayer()) || {}).nick);
  out.push('errors=' + window.__errors.length + ' ' + window.__errors.join('|'));
  document.body.dataset.result = out.join(';');
})();
```

- [ ] **Step 3: Podłącz skrypty w `index.html`** — zamień `<script src="game.js"></script>` na:

```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="db.js"></script>
  <script src="game.js"></script>
```

- [ ] **Step 4: Uruchom test dymny — ma nie przejść**

```bash
cd "$P" && node "$S/make-harness.mjs" . "$S/smoke.js" "$S/smoke.html" \
  && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --virtual-time-budget=20000 --dump-dom "file:///$S/smoke.html" 2>/dev/null | grep -o 'data-result="[^"]*"'
```
Expected: brak `data-result` (scenariusz przerywa `ReferenceError: initDb is not defined`; `db.js` nie istnieje).

- [ ] **Step 5: Utwórz `db.js`**

```js
// =====================================================================
// BAZA DANYCH (Supabase) — wspólny ranking i zapis przerwanej gry
// Każda funkcja zwraca wynik albo null/false przy błędzie i nigdy nie
// rzuca wyjątku — gra działa także bez internetu i bez bazy.
// =====================================================================

const SUPABASE_URL = 'https://geudeqgbhjrlnuzantvh.supabase.co';
// Klucz publiczny — jawny z założenia; dane chronią reguły RLS w bazie.
const SUPABASE_KEY = 'sb_publishable_AQdcMJa_MDniVulQEN1ShQ_jrp3mKHD';

let dbClient = null;
let playerId = null;

function initDb() {
  if (!window.supabase) {
    console.warn('Biblioteka supabase-js niedostępna — gra bez rankingu i zapisu.');
    return false;
  }
  dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return true;
}

function getPlayerId() {
  return playerId;
}

// Wykonuje operację na bazie; przy braku klienta lub błędzie zwraca wartość zastępczą.
async function safely(action, fallback, work) {
  if (!dbClient) return fallback;
  try {
    return await work();
  } catch (error) {
    console.warn(`Baza: ${action} nie powiodło się`, error);
    return fallback;
  }
}

async function currentSession() {
  const { data, error } = await dbClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Gracz z poprzedniej wizyty (sesja zapamiętana w przeglądarce) albo null.
async function getStoredPlayer() {
  return safely('odczyt gracza', null, async () => {
    const session = await currentSession();
    if (!session) return null;
    const { data, error } = await dbClient
      .from('players').select('id, nick, has_account').eq('id', session.user.id).maybeSingle();
    if (error) throw error;
    if (data) playerId = data.id;
    return data;
  });
}

// Sesja wygasła albo użytkownik został usunięty w panelu Supabase.
function isSessionProblem(error) {
  return error.status === 401 || error.status === 403
    || error.code === 'PGRST301' || error.code === '23503';
}

async function signInAndSavePlayer(nick) {
  let session = await currentSession();
  if (!session) {
    const { data, error } = await dbClient.auth.signInAnonymously();
    if (error) throw error;
    session = data.session;
  }
  const userId = session.user.id;
  const { data: player, error: readError } = await dbClient
    .from('players').select('nick, has_account').eq('id', userId).maybeSingle();
  if (readError) throw readError;

  if (player === null) {
    const { error } = await dbClient.from('players').insert({ nick });
    if (error) throw error;
  } else if (!player.has_account && player.nick !== nick) {
    const { error } = await dbClient.from('players').update({ nick }).eq('id', userId);
    if (error) throw error;
  }
  playerId = userId;
}

// Loguje anonimowo (jeśli trzeba) i zapisuje nick. true = można zapisywać.
async function ensurePlayer(nick) {
  return safely('logowanie gracza', false, async () => {
    playerId = null;
    try {
      await signInAndSavePlayer(nick);
    } catch (error) {
      if (!isSessionProblem(error)) throw error;
      // Jedna próba z nową sesją; zwykły błąd sieci nie kasuje tożsamości gracza.
      await dbClient.auth.signOut();
      await signInAndSavePlayer(nick);
    }
    return true;
  });
}

async function saveGame(snapshot) {
  return safely('zapis gry', false, async () => {
    if (!playerId) return false;
    const { error } = await dbClient.from('saved_games').upsert(snapshot);
    if (error) throw error;
    return true;
  });
}

async function loadSavedGame() {
  return safely('odczyt zapisu gry', null, async () => {
    if (!playerId) return null;
    const { data, error } = await dbClient
      .from('saved_games').select('level, snake, fruit, direction, score').maybeSingle();
    if (error) throw error;
    return data;
  });
}

async function deleteSavedGame() {
  return safely('usunięcie zapisu gry', false, async () => {
    if (!playerId) return false;
    const { error } = await dbClient.from('saved_games').delete().eq('player_id', playerId);
    if (error) throw error;
    return true;
  });
}

async function addScore(level, score) {
  return safely('zapis wyniku', false, async () => {
    if (!playerId) return false;
    const { error } = await dbClient.from('scores').insert({ level, score });
    if (error) throw error;
    return true;
  });
}

// Top 10 poziomu; null oznacza brak połączenia (pusta tablica = brak wyników).
async function getLeaderboard(level) {
  return safely('odczyt rankingu', null, async () => {
    const { data, error } = await dbClient
      .from('leaderboard').select('position, nick, score, player_id, has_account')
      .eq('level', level).order('position');
    if (error) throw error;
    return data;
  });
}

// ---------- Konta: login + hasło (adres techniczny, bez maili) ----------

const ACCOUNT_DOMAIN = 'wezoidy.local';

function loginToEmail(login) {
  return `${login}@${ACCOUNT_DOMAIN}`;
}

// Zamienia błąd Supabase Auth na powód zrozumiały dla interfejsu.
function accountErrorReason(error) {
  if (error.code === 'user_already_exists' || error.code === 'email_exists') return 'taken';
  if (error.code === 'weak_password') return 'weak-password';
  if (error.code === 'invalid_credentials') return 'invalid';
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return 'offline';
  return 'error';
}

// Przy grze bez konta zamienia anonimową sesję w konto — wyniki i zapis gry zostają.
async function registerAccount(login, password) {
  return safely('zakładanie konta', { ok: false, reason: 'offline' }, async () => {
    const session = await currentSession();
    const credentials = { email: loginToEmail(login), password };
    const { error } = session && session.user.is_anonymous
      ? await dbClient.auth.updateUser(credentials)
      : await dbClient.auth.signUp(credentials);
    if (error) return { ok: false, reason: accountErrorReason(error) };
    await getStoredPlayer();
    return { ok: true };
  });
}

async function signInAccount(login, password) {
  return safely('logowanie', { ok: false, reason: 'offline' }, async () => {
    const { error } = await dbClient.auth.signInWithPassword({ email: loginToEmail(login), password });
    if (error) return { ok: false, reason: accountErrorReason(error) };
    await getStoredPlayer();
    return { ok: true };
  });
}

async function signOutAccount() {
  return safely('wylogowanie', false, async () => {
    const { error } = await dbClient.auth.signOut();
    if (error) throw error;
    playerId = null;
    return true;
  });
}
```

- [ ] **Step 6: Uruchom test dymny — ma przejść**

Run: komenda z kroku 4.
Expected: `init=true;storedBefore=null;ensure=true;hasId=true;save=true;resave=true;loadDir=up;delete=true;loadAfterDelete=null;score=true;inBoard=true;storedAfter=test-smoke;errors=0`
(Jeśli brak `data-result`: zamień `--virtual-time-budget=20000` na `--timeout=20000` — sieć w czasie wirtualnym bywa niestabilna.)

- [ ] **Step 7: Sprawdź, że gra nadal działa i RLS bez zmian**

```bash
cd "$P" && node --test "tests/*.test.js" && node supabase/test-rls.mjs | tail -1
```
Expected: testy Node PASS; `WYNIK: 38 PASS, 0 FAIL`.

- [ ] **Step 8: Commit**

```bash
cd "$P" && git add db.js index.html && git commit -m "Warstwa bazy db.js (Supabase): ranking, zapis gry, konta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Nick i wspólny ranking (ekran startowy i końcowy)

**Files:**
- Modify: `index.html` (ekran startowy, ekran końca gry), `style.css` (na końcu pliku), `game.js` (sekcje 2, 5, 6, 7, nowa 8, inicjalizacja)
- Pomocnicze (bez commita): `$S/e2e-ranking.js`

**Interfaces:**
- Consumes: z Task 1 `normalizeNick`, `NICK_MIN`, `NICK_MAX`; z Task 3 `initDb`, `getStoredPlayer`, `ensurePlayer`, `deleteSavedGame`, `addScore`, `getLeaderboard`, `getPlayerId`.
- Produces:
  - `enqueueDb(task: () => Promise<any>): Promise<any>` — kolejka operacji bazodanowych, nigdy nie odrzuca.
  - `renderLeaderboard(listElement, rows | null, highlightId): void`, `renderLeaderboardNote(listElement, text): void`
  - `showMessage(element, text)`, `hideMessage(element)`
  - `showLeaderboardTab(level)`, `refreshStartScreen()`, `goToStart()`
  - Elementy: `nickInput`, `nickMessage`, `startLeaderboardElement`, `endLeaderboardElement`, `scoreMessageElement`.

- [ ] **Step 1: Napisz scenariusz e2e `$S/e2e-ranking.js`**

```js
(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const out = [];
  const input = document.getElementById('nick-input');
  const typeKey = key => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await wait(2000);
  out.push('startBoard=' + (document.querySelectorAll('#start-leaderboard li').length > 0));

  input.value = '';
  startGame('easy');
  out.push('noNickScreen=' + state.screen);
  out.push('nickMsgVisible=' + !document.getElementById('nick-message').classList.contains('hidden'));

  for (const key of ['w', 's', ' ', 'p', 'Escape']) typeKey(key);
  out.push('typingScreen=' + state.screen);

  const list = document.createElement('ol');
  renderLeaderboard(list, [
    { position: 1, nick: '<b>x</b>', score: 3, player_id: 'p1', has_account: false },
    { position: 2, nick: 'ola', score: 2, player_id: 'p2', has_account: true },
  ], 'p1');
  out.push('xss=' + (list.querySelector('b') === null && list.textContent.includes('<b>x</b>')));
  out.push('ownRow=' + list.firstChild.classList.contains('own'));
  out.push('check=' + list.children[1].textContent.includes('ola ✓') + ',' + !list.children[0].textContent.includes('✓'));

  input.value = '  test-e2e  ';
  typeKey('Enter');
  out.push('enterScreen=' + state.screen + ' level=' + state.level);
  await wait(3000);
  state.score = 2;
  endGame(false);
  await wait(4000);
  out.push('endRows=' + document.querySelectorAll('#end-leaderboard .leaderboard-row').length);
  out.push('ownEnd=' + document.querySelectorAll('#end-leaderboard .own').length);
  out.push('scoreMsgHidden=' + document.getElementById('score-message').classList.contains('hidden'));
  goToStart();
  await wait(2000);
  out.push('backOnStart=' + state.screen + ' hasId=' + (getPlayerId() !== null));
  out.push('errors=' + window.__errors.length + ' ' + window.__errors.join('|'));
  document.body.dataset.result = out.join(';');
})();
```

- [ ] **Step 2: Uruchom e2e — ma nie przejść**

```bash
cd "$P" && node "$S/make-harness.mjs" . "$S/e2e-ranking.js" "$S/e2e-ranking.html" \
  && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --virtual-time-budget=30000 --dump-dom "file:///$S/e2e-ranking.html" 2>/dev/null | grep -o 'data-result="[^"]*"'
```
Expected: brak `data-result` (scenariusz przerywa błąd — brak `#nick-input` / `renderLeaderboard`).

- [ ] **Step 3: Rozbuduj ekran startowy w `index.html`** — zamień blok od `<h1 class="title">Wężoidy</h1>` do końca `<p class="hint">…</p>` na:

```html
      <h1 class="title">Wężoidy</h1>
      <label class="nick-field">
        Twój nick
        <input id="nick-input" class="nick-input" type="text" maxlength="16" autocomplete="off" placeholder="3–16 znaków">
      </label>
      <p id="nick-message" class="message hidden"></p>
      <div class="levels">
        <button class="level-button" data-level="easy">Łatwy</button>
        <button class="level-button" data-level="medium">Średni</button>
        <button class="level-button" data-level="hard">Trudny</button>
      </div>
      <p class="hint">Sterowanie: strzałki lub WASD · Enter = start na poziomie Średnim</p>
      <section class="leaderboard">
        <h2 class="leaderboard-title">Ranking</h2>
        <div class="leaderboard-tabs">
          <button class="tab-button" data-board-level="easy">Łatwy</button>
          <button class="tab-button active" data-board-level="medium">Średni</button>
          <button class="tab-button" data-board-level="hard">Trudny</button>
        </div>
        <ol id="start-leaderboard" class="leaderboard-list"></ol>
      </section>
```

- [ ] **Step 4: Rozbuduj ekran końca gry w `index.html`** — zamień `<p class="final-score">…</p>` i przycisk na:

```html
      <p class="final-score">Wynik: <span id="final-score">0</span></p>
      <p id="score-message" class="message hidden"></p>
      <ol id="end-leaderboard" class="leaderboard-list"></ol>
      <button id="restart-button" class="level-button">Zagraj ponownie</button>
```

- [ ] **Step 5: Dodaj style na końcu `style.css`**

```css
/* ---------- Nick i komunikaty ---------- */

.nick-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.nick-input {
  width: 240px;
  padding: 10px 14px;
  border: 2px solid #2a2f3a;
  border-radius: 10px;
  background: var(--board-bg);
  color: var(--text);
  font: inherit;
  font-size: 18px;
  text-align: center;
}

.nick-input:focus {
  border-color: var(--accent);
  outline: none;
}

.message {
  margin: 0;
  color: var(--fruit);
  font-size: 14px;
}

/* ---------- Ranking ---------- */

.leaderboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 320px;
}

.leaderboard-title {
  margin: 0;
  font-size: 20px;
}

.leaderboard-tabs {
  display: flex;
  gap: 6px;
}

.tab-button {
  padding: 4px 12px;
  border: 1px solid #2a2f3a;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.tab-button.active {
  border-color: var(--accent);
  color: var(--accent);
}

.leaderboard-list {
  width: 320px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
}

.leaderboard-row:nth-child(odd) {
  background: var(--board-bg);
}

.leaderboard-row.own {
  color: var(--accent);
  font-weight: 700;
}

.leaderboard-pos {
  color: var(--muted);
  text-align: right;
}

.leaderboard-nick {
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaderboard-note {
  padding: 6px;
  color: var(--muted);
  font-size: 14px;
}
```

- [ ] **Step 6: Dodaj kolejkę i zmienną rankingu w sekcji 2 `game.js`** (pod `let timerId = null;`)

```js
let dbQueue = Promise.resolve(); // operacje na bazie wykonywane po kolei
let boardLevel = 'medium';       // poziom pokazywany w rankingu na ekranie startowym
```

- [ ] **Step 7: Zastąp `handleKeydown` w sekcji 5 `game.js`**

```js
function handleKeydown(event) {
  const key = event.key.toLowerCase();
  const isConfirmKey = key === 'enter' || key === ' ';

  // Podczas wpisywania nicku litery i spacja trafiają do pola; Enter startuje grę.
  if (event.target === nickInput && key !== 'enter') return;

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
      goToStart();
    }
  }
}
```

- [ ] **Step 8: Dodaj elementy i rysowanie rankingu w sekcji 6 `game.js`**

Pod `const endTitleElement = …;` dopisz:

```js
const nickInput = document.getElementById('nick-input');
const nickMessage = document.getElementById('nick-message');
const startLeaderboardElement = document.getElementById('start-leaderboard');
const endLeaderboardElement = document.getElementById('end-leaderboard');
const scoreMessageElement = document.getElementById('score-message');
```

Na końcu sekcji 6 (po funkcji `render`) dopisz:

```js
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
```

- [ ] **Step 9: Zastąp `startGame` i `endGame` w sekcji 7 `game.js`**

```js
function startGame(level) {
  const nick = normalizeNick(nickInput.value);
  if (nick === null) {
    showMessage(nickMessage, `Wpisz nick (${NICK_MIN}–${NICK_MAX} znaków)`);
    nickInput.focus();
    return;
  }
  hideMessage(nickMessage);
  resetState(level);
  render();
  showScreen('play');
  startLoop();

  // Logowanie i usunięcie starego zapisu w tle — gra nie czeka na bazę.
  enqueueDb(async () => {
    if (await ensurePlayer(nick)) {
      await deleteSavedGame();
    }
  });
}

function endGame(isWin) {
  stopLoop();
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
```

- [ ] **Step 10: Dodaj sekcję 8 w `game.js`** (przed `// INICJALIZACJA`)

```js
// =====================================================================
// 8. BAZA W TLE, PAUZA I WZNAWIANIE
// =====================================================================

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
  });
}

function goToStart() {
  showScreen('start');
  refreshStartScreen();
}
```

- [ ] **Step 11: Zastąp sekcję INICJALIZACJA w `game.js`**

```js
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

initDb();
createBoard();
goToStart();
```

- [ ] **Step 12: Uruchom e2e i testy Node — mają przejść**

Run: komenda z kroku 2, potem `cd "$P" && node --test "tests/*.test.js"`.
Expected: `startBoard=true;noNickScreen=start;nickMsgVisible=true;typingScreen=start;xss=true;ownRow=true;check=true,true;enterScreen=play level=medium;endRows=<1–10>;ownEnd=1;scoreMsgHidden=true;backOnStart=start hasId=true;errors=0` oraz testy Node PASS.

- [ ] **Step 13: Sprawdź wygląd** — zrzut ekranu startowego:

```bash
cd "$P" && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --window-size=700,1200 --virtual-time-budget=5000 --screenshot="$S/start.png" "file:///$P/index.html" 2>/dev/null
```
Obejrzyj `$S/start.png` (Read): pole nicku, przyciski, ranking z zakładkami, spójne kolory, nic nie nachodzi na siebie.

- [ ] **Step 14: Commit**

```bash
cd "$P" && git add index.html style.css game.js && git commit -m "Nick gracza i wspólny ranking na ekranie startowym i końcowym

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Pauza, automatyczny zapis, odliczanie i wznawianie

**Files:**
- Modify: `index.html` (przycisk „Wznów”, wskaźnik zapisu, nakładki), `style.css` (na końcu), `game.js` (sekcje 5, 6, 7, 8, inicjalizacja)
- Pomocnicze (bez commita): `$S/e2e-pause.js`

**Interfaces:**
- Consumes: z Task 1 `toSavedGame`, `isValidSavedGame`, `restoreState`, `AUTOSAVE_INTERVAL`, `COUNTDOWN_FROM`; z Task 3 `saveGame`, `loadSavedGame`, `deleteSavedGame`; z Task 4 `enqueueDb`, `goToStart`, `refreshStartScreen`.
- Produces: `pauseGame()`, `resumeGame()`, `exitToMenu()`, `resumeSavedGame()`, `saveNow(): Promise<boolean>`, `autosave()`, `startAutosave()`, `stopAutosave()`, `startCountdown()`, `stopCountdown()`, `updateResumeButton(saved | null)`, `setSaveIndicator(text)`; nowe wartości `state.screen`: `'pause'`, `'countdown'`.

**Uwaga (doprecyzowanie spec §5):** komunikat o nieudanym logowaniu pokazujemy we wskaźniku zapisu na ekranie gry („○ gra bez rankingu i zapisu”), bo w chwili odpowiedzi bazy pole nicku jest już niewidoczne.

- [ ] **Step 1: Napisz scenariusz e2e `$S/e2e-pause.js`**

```js
(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const out = [];
  const press = key => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  const setHidden = value => Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
  await wait(1500);

  document.getElementById('nick-input').value = 'test-pauza';
  startGame('easy');
  await wait(6000);
  out.push('indicator=' + document.getElementById('save-status').textContent);

  press('p');
  await wait(1500);
  out.push('pauseScreen=' + state.screen);
  const pausedSnake = JSON.stringify(state.snake);
  const saved = await loadSavedGame();
  out.push('savedValid=' + isValidSavedGame(saved) + ' sameSnake=' + (saved !== null && JSON.stringify(saved.snake) === pausedSnake));

  document.getElementById('pause-exit-button').click();
  await wait(2000);
  const resume = document.getElementById('resume-button');
  out.push('resumeVisible=' + !resume.classList.contains('hidden') + ' text=' + resume.textContent);

  resume.click();
  await wait(300);
  out.push('countdown=' + state.screen + ' restored=' + (JSON.stringify(state.snake) === pausedSnake));
  await wait(3500);
  out.push('afterCountdown=' + state.screen);

  setHidden(true);
  document.dispatchEvent(new Event('visibilitychange'));
  out.push('hiddenPause=' + state.screen);
  setHidden(false);
  press('Enter');
  await wait(3500);
  out.push('resumedByEnter=' + state.screen);

  autosave();
  endGame(false);
  await wait(4000);
  out.push('saveAfterEnd=' + JSON.stringify(await loadSavedGame()));
  goToStart();
  await wait(2000);
  out.push('resumeHiddenAfterEnd=' + document.getElementById('resume-button').classList.contains('hidden'));
  out.push('errors=' + window.__errors.length + ' ' + window.__errors.join('|'));
  document.body.dataset.result = out.join(';');
})();
```

- [ ] **Step 2: Uruchom e2e — ma nie przejść**

```bash
cd "$P" && node "$S/make-harness.mjs" . "$S/e2e-pause.js" "$S/e2e-pause.html" \
  && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --virtual-time-budget=40000 --dump-dom "file:///$S/e2e-pause.html" 2>/dev/null | grep -o 'data-result="[^"]*"'
```
Expected: brak `data-result` (brak `#save-status` → błąd w scenariuszu).

- [ ] **Step 3: Zmiany w `index.html`**

Pod `<div class="levels">…</div>` (przed `<p class="hint">`) dodaj:

```html
      <button id="resume-button" class="level-button resume-button hidden">Wznów grę</button>
```

Zmień podpowiedź ekranu startowego na:

```html
      <p class="hint">Sterowanie: strzałki lub WASD · P / Esc = pauza · Enter = start na poziomie Średnim</p>
```

Zastąp całą sekcję `play-screen`:

```html
    <!-- Rozgrywka -->
    <section id="play-screen" class="screen hidden">
      <header class="scoreboard">
        <span id="score" class="score">0</span>
        <span id="save-status" class="save-status"></span>
        <span id="level-name" class="level-name">Średni</span>
      </header>
      <div class="board-wrap">
        <div id="board" class="board"></div>
        <div id="pause-overlay" class="overlay hidden">
          <p class="overlay-title">Pauza</p>
          <button id="pause-resume-button" class="level-button">Wznów</button>
          <button id="pause-exit-button" class="level-button">Wyjdź do menu</button>
        </div>
        <div id="countdown-overlay" class="overlay hidden">
          <span id="countdown" class="countdown">3</span>
        </div>
      </div>
      <p class="hint">P / Esc = pauza</p>
    </section>
```

- [ ] **Step 4: Dodaj style na końcu `style.css`**

```css
/* ---------- Pauza, odliczanie, zapis ---------- */

.resume-button {
  border-color: var(--accent-light);
}

.save-status {
  color: var(--muted);
  font-size: 13px;
}

.board-wrap {
  position: relative;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border-radius: 12px;
  background: rgba(15, 17, 21, 0.78);
}

.overlay-title {
  margin: 0;
  font-size: 40px;
  font-weight: 700;
  color: var(--accent);
}

.countdown {
  font-size: 96px;
  font-weight: 700;
  color: var(--accent-light);
}
```

- [ ] **Step 5: Zastąp `handleKeydown` w sekcji 5 `game.js`**

```js
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
```

- [ ] **Step 6: Dodaj elementy w sekcji 6 `game.js`** (pod elementami z Task 4)

```js
const saveStatusElement = document.getElementById('save-status');
const resumeButton = document.getElementById('resume-button');
const pauseOverlay = document.getElementById('pause-overlay');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownElement = document.getElementById('countdown');
```

- [ ] **Step 7: Zastąp `showScreen`, `startGame`, `endGame` w sekcji 7 `game.js`**

Nad `function showScreen` dodaj mapę i zastąp funkcję:

```js
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
```

```js
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
```

- [ ] **Step 8: Rozbuduj sekcję 8 `game.js`**

Na początku sekcji 8 (pod nagłówkiem) dodaj zmienne:

```js
let autosaveId = null;
let autosaveBusy = false;
let countdownId = null;
let dbOnline = false;        // czy gracz jest zalogowany i można zapisywać
let resumeCandidate = null;  // poprawny zapis gotowy do wznowienia
```

Zastąp `refreshStartScreen`:

```js
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
```

Na końcu sekcji 8 dopisz:

```js
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
```

- [ ] **Step 9: Dopisz zdarzenia w sekcji INICJALIZACJA** (przed `initDb();`)

```js
resumeButton.addEventListener('click', resumeSavedGame);
document.getElementById('pause-resume-button').addEventListener('click', resumeGame);
document.getElementById('pause-exit-button').addEventListener('click', exitToMenu);

// Przełączenie karty lub zminimalizowanie okna = pauza z zapisem.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});
```

- [ ] **Step 10: Uruchom e2e, e2e z Task 4 i testy Node — mają przejść**

Run: komenda z kroku 2; komenda z Task 4 krok 2; `cd "$P" && node --test "tests/*.test.js"`.
Expected (pauza): `indicator=● zapisano;pauseScreen=pause;savedValid=true sameSnake=true;resumeVisible=true text=Wznów grę (Łatwy, wynik 0);countdown=countdown restored=true;afterCountdown=play;hiddenPause=pause;resumedByEnter=play;saveAfterEnd=null;resumeHiddenAfterEnd=true;errors=0`
Expected (ranking): jak w Task 4 krok 12. Testy Node PASS.

- [ ] **Step 11: Sprawdź wygląd pauzy i odliczania** — scenariusz `$S/shot-pause.js`:

```js
document.getElementById('nick-input').value = 'podglad';
startGame('easy'); stopLoop(); stopAutosave(); showScreen('pause');
```

```bash
cd "$P" && node "$S/make-harness.mjs" . "$S/shot-pause.js" "$S/shot-pause.html" \
  && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --window-size=700,800 --screenshot="$S/pause.png" "file:///$S/shot-pause.html" 2>/dev/null
```
Obejrzyj `$S/pause.png`: nakładka „Pauza” na planszy, dwa przyciski, wąż widoczny pod spodem.

- [ ] **Step 12: Commit**

```bash
cd "$P" && git add index.html style.css game.js && git commit -m "Pauza, automatyczny zapis, odliczanie i wznawianie przerwanej gry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Konto w interfejsie (rejestracja, logowanie, wylogowanie)

**Files:**
- Modify: `index.html` (panel gracza na ekranie startowym), `style.css` (na końcu), `game.js` (sekcje 5, 6, 7, 8, inicjalizacja)
- Pomocnicze (bez commita): `$S/e2e-accounts.js`, `$S/shot-account.js`

**Interfaces:**
- Consumes: z Task 1 `normalizeLogin`, `PASSWORD_MIN`; z Task 3 `registerAccount`, `signInAccount`, `signOutAccount`, `getStoredPlayer`; z Task 4 `enqueueDb`, `showMessage`, `hideMessage`, `showLeaderboardTab`, `goToStart`; z Task 5 `refreshStartScreen`, `updateResumeButton`.
- Produces: `currentPlayer: {id, nick, has_account} | null`, `updateAccountPanel()`, `openAccountForm(mode: 'register'|'login')`, `closeAccountForm()`, `submitAccountForm(event)`, `logout()`; elementy `guestPanel`, `accountPanel`, `accountNickElement`, `accountForm`, `loginInput`, `passwordInput`, `accountMessage`.

- [ ] **Step 1: Napisz scenariusz e2e `$S/e2e-accounts.js`**

```js
(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const out = [];
  const login = 'test-' + Math.random().toString(36).slice(2, 8);
  const password = 'Haslo-' + login;
  const message = () => (accountMessage.classList.contains('hidden') ? '' : accountMessage.textContent);
  const submit = async (mode, loginValue, passwordValue) => {
    openAccountForm(mode);
    loginInput.value = loginValue;
    passwordInput.value = passwordValue;
    accountForm.requestSubmit();
    await wait(3000);
  };
  await wait(1500);

  // 1. Gra bez konta z wynikiem
  nickInput.value = 'gosc-' + login.slice(5);
  startGame('hard');
  await wait(1500);
  state.score = 1;
  endGame(false);
  await wait(4000);
  goToStart();
  await wait(2000);

  // 2. Walidacja formularza
  await submit('register', 'żółw', password);
  out.push('badLogin=' + message());
  await submit('register', login, '123');
  out.push('shortPass=' + message());

  // 3. Założenie konta z sesji anonimowej (wielkie litery → małe)
  await submit('register', login.toUpperCase(), password);
  out.push('accountPanel=' + !accountPanel.classList.contains('hidden') + ' nick=' + accountNickElement.textContent);
  showLeaderboardTab('hard');
  await wait(2000);
  const own = document.querySelector('#start-leaderboard .own');
  out.push('ownCheck=' + (own !== null && own.textContent.includes(login + ' ✓')));

  // 4. Gra z kontem bez wpisywania nicku
  nickInput.value = '';
  startGame('easy');
  out.push('accountStart=' + state.screen);
  endGame(false);
  await wait(4000);
  goToStart();
  await wait(2000);

  // 5. Wylogowanie
  logout();
  await wait(2000);
  out.push('loggedOut=' + !guestPanel.classList.contains('hidden') + ',' + accountPanel.classList.contains('hidden'));

  // 6. Złe hasło, zajęty login, poprawne logowanie
  await submit('login', login, 'zle-haslo');
  out.push('wrongPass=' + message());
  await submit('register', login, password);
  out.push('taken=' + message());
  closeAccountForm();
  await submit('login', login, password);
  out.push('loggedIn=' + !accountPanel.classList.contains('hidden') + ' nick=' + accountNickElement.textContent);

  out.push('errors=' + window.__errors.length + ' ' + window.__errors.join('|'));
  document.body.dataset.result = out.join(';');
})();
```

- [ ] **Step 2: Uruchom e2e — ma nie przejść**

```bash
cd "$P" && node "$S/make-harness.mjs" . "$S/e2e-accounts.js" "$S/e2e-accounts.html" \
  && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --virtual-time-budget=60000 --dump-dom "file:///$S/e2e-accounts.html" 2>/dev/null | grep -o 'data-result="[^"]*"'
```
Expected: brak `data-result` (`openAccountForm is not defined`).

- [ ] **Step 3: Zmiany w `index.html`** — zamień `<label class="nick-field">…</label>` i `<p id="nick-message" …></p>` na:

```html
      <div id="guest-panel" class="player-panel">
        <label class="nick-field">
          Twój nick
          <input id="nick-input" class="nick-input" type="text" maxlength="16" autocomplete="off" placeholder="3–16 znaków">
        </label>
        <p id="nick-message" class="message hidden"></p>
        <p class="account-links">
          <button id="show-register" class="link-button" type="button">Załóż konto</button>
          ·
          <button id="show-login" class="link-button" type="button">Zaloguj</button>
        </p>
      </div>
      <div id="account-panel" class="player-panel hidden">
        <p class="account-info">Zalogowano jako <strong id="account-nick"></strong> ✓</p>
        <button id="logout-button" class="link-button" type="button">Wyloguj</button>
      </div>
      <form id="account-form" class="account-form hidden" novalidate>
        <h2 id="account-form-title" class="account-form-title">Załóż konto</h2>
        <input id="login-input" class="nick-input" type="text" maxlength="16" autocomplete="username" placeholder="login: litery, cyfry, _ lub -">
        <input id="password-input" class="nick-input" type="password" autocomplete="new-password" placeholder="hasło (min. 6 znaków)">
        <p id="account-note" class="hint"></p>
        <p id="account-message" class="message hidden"></p>
        <div class="account-actions">
          <button id="account-submit" class="level-button" type="submit">Załóż konto</button>
          <button id="account-cancel" class="link-button" type="button">Anuluj</button>
        </div>
      </form>
```

- [ ] **Step 4: Dodaj style na końcu `style.css`**

```css
/* ---------- Konto ---------- */

.player-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.link-button {
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
}

.account-links,
.account-info {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.account-info strong {
  color: var(--accent);
}

.account-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.account-form-title {
  margin: 0;
  font-size: 20px;
}

.account-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
```

- [ ] **Step 5: W `handleKeydown` (sekcja 5 `game.js`) zamień linię z `event.target === nickInput`** na:

```js
  // W polach tekstowych klawisze należą do pola. Enter w polu nicku startuje grę,
  // Enter w formularzu konta wysyła formularz (obsługuje to przeglądarka).
  if (event.target.tagName === 'INPUT' && (event.target !== nickInput || key !== 'enter')) return;
```

- [ ] **Step 6: Dodaj elementy i panel w sekcji 6 `game.js`** (pod elementami z Task 5)

```js
const guestPanel = document.getElementById('guest-panel');
const accountPanel = document.getElementById('account-panel');
const accountNickElement = document.getElementById('account-nick');
const accountForm = document.getElementById('account-form');
const accountFormTitle = document.getElementById('account-form-title');
const loginInput = document.getElementById('login-input');
const passwordInput = document.getElementById('password-input');
const accountNote = document.getElementById('account-note');
const accountMessage = document.getElementById('account-message');
const accountSubmit = document.getElementById('account-submit');
```

Na końcu sekcji 6 dopisz:

```js
function updateAccountPanel() {
  const hasAccount = currentPlayer !== null && currentPlayer.has_account;
  accountForm.classList.add('hidden');
  guestPanel.classList.toggle('hidden', hasAccount);
  accountPanel.classList.toggle('hidden', !hasAccount);
  if (hasAccount) {
    accountNickElement.textContent = currentPlayer.nick;
  }
}
```

- [ ] **Step 7: W `startGame` (sekcja 7 `game.js`) zamień pierwszą linię** `const nick = normalizeNick(nickInput.value);` na:

```js
  // Gracz z kontem gra pod loginem; gracz bez konta — pod wpisanym nickiem.
  const nick = currentPlayer !== null && currentPlayer.has_account
    ? currentPlayer.nick
    : normalizeNick(nickInput.value);
```

- [ ] **Step 8: Rozbuduj sekcję 8 `game.js`**

Do zmiennych na początku sekcji 8 dopisz:

```js
let currentPlayer = null;      // {id, nick, has_account} z bazy albo null
let accountMode = 'register';  // 'register' | 'login'

const ACCOUNT_ERRORS = {
  taken: 'Ten login jest już zajęty',
  'weak-password': 'Hasło jest za słabe',
  invalid: 'Nieprawidłowy login lub hasło',
  offline: 'Brak połączenia z bazą',
  error: 'Coś poszło nie tak – spróbuj ponownie',
};
```

Zastąp `refreshStartScreen`:

```js
function refreshStartScreen() {
  showLeaderboardTab(boardLevel);
  enqueueDb(async () => {
    currentPlayer = await getStoredPlayer();
    updateAccountPanel();
    if (currentPlayer && !currentPlayer.has_account && nickInput.value.trim() === '') {
      nickInput.value = currentPlayer.nick;
    }
    updateResumeButton(currentPlayer ? await loadSavedGame() : null);
  });
}
```

Na końcu sekcji 8 dopisz:

```js
function openAccountForm(mode) {
  accountMode = mode;
  const isRegister = mode === 'register';
  accountFormTitle.textContent = isRegister ? 'Załóż konto' : 'Zaloguj';
  accountSubmit.textContent = isRegister ? 'Załóż konto' : 'Zaloguj';
  accountNote.textContent = isRegister
    ? 'Wyniki i zapis gry z tej przeglądarki zostaną przeniesione na konto.'
    : 'Wyniki gry bez konta z tej przeglądarki nie zostaną przeniesione.';
  passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
  hideMessage(accountMessage);
  guestPanel.classList.add('hidden');
  accountForm.classList.remove('hidden');
  loginInput.focus();
}

function closeAccountForm() {
  passwordInput.value = '';
  updateAccountPanel();
}

async function submitAccountForm(event) {
  event.preventDefault();
  const login = normalizeLogin(loginInput.value);
  const password = passwordInput.value;
  if (login === null) {
    showMessage(accountMessage, 'Login: 3–16 znaków – litery bez polskich znaków, cyfry, _ lub -');
    return;
  }
  if (password.length < PASSWORD_MIN) {
    showMessage(accountMessage, `Hasło: co najmniej ${PASSWORD_MIN} znaków`);
    return;
  }
  accountSubmit.disabled = true;
  const result = await enqueueDb(() => (accountMode === 'register'
    ? registerAccount(login, password)
    : signInAccount(login, password)));
  accountSubmit.disabled = false;
  if (!result || !result.ok) {
    showMessage(accountMessage, ACCOUNT_ERRORS[result ? result.reason : 'error']);
    return;
  }
  loginInput.value = '';
  passwordInput.value = '';
  refreshStartScreen();
}

function logout() {
  enqueueDb(() => signOutAccount()).then(() => {
    currentPlayer = null;
    nickInput.value = '';
    updateResumeButton(null);
    updateAccountPanel();
    refreshStartScreen();
  });
}
```

- [ ] **Step 9: Dopisz zdarzenia w sekcji INICJALIZACJA** (przed `initDb();`)

```js
document.getElementById('show-register').addEventListener('click', () => openAccountForm('register'));
document.getElementById('show-login').addEventListener('click', () => openAccountForm('login'));
document.getElementById('account-cancel').addEventListener('click', closeAccountForm);
document.getElementById('logout-button').addEventListener('click', logout);
accountForm.addEventListener('submit', submitAccountForm);
```

- [ ] **Step 10: Uruchom wszystkie testy — mają przejść**

Run: komenda z kroku 2; e2e z Task 4 krok 2 i Task 5 krok 2; `cd "$P" && node --test "tests/*.test.js"`.
Expected (konta): `badLogin=Login: 3–16 znaków – litery bez polskich znaków, cyfry, _ lub -;shortPass=Hasło: co najmniej 6 znaków;accountPanel=true nick=<login>;ownCheck=true;accountStart=play;loggedOut=true,true;wrongPass=Nieprawidłowy login lub hasło;taken=Ten login jest już zajęty;loggedIn=true nick=<login>;errors=0`
Expected (ranking, pauza): jak wcześniej. Testy Node PASS.
(Supabase ogranicza liczbę logowań na godzinę — przy błędach `offline`/`error` po wielu uruchomieniach odczekaj kilka minut.)

- [ ] **Step 11: Sprawdź wygląd formularza** — scenariusz `$S/shot-account.js`:

```js
openAccountForm('register');
showMessage(accountMessage, 'Ten login jest już zajęty');
```

```bash
cd "$P" && node "$S/make-harness.mjs" . "$S/shot-account.js" "$S/shot-account.html" \
  && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --window-size=700,1300 --screenshot="$S/account.png" "file:///$S/shot-account.html" 2>/dev/null
```
Obejrzyj `$S/account.png`: formularz w miejscu pola nicku, czytelne pola, komunikat błędu na czerwono, „Anuluj” jako odnośnik.

- [ ] **Step 12: Commit**

```bash
cd "$P" && git add index.html style.css game.js && git commit -m "Opcjonalne konto: rejestracja, logowanie i wylogowanie na ekranie startowym

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Tryb bez internetu, aktualizacja wymagań, publikacja

**Files:**
- Modify: `wymagania.md`
- Pomocnicze (bez commita): `$S/e2e-offline.js`

**Interfaces:**
- Consumes: całość z Task 1–6.
- Produces: zaktualizowane wymagania; gałąź `feat/supabase` wypchnięta, PR do `main`.

- [ ] **Step 1: Napisz scenariusz offline `$S/e2e-offline.js`**

```js
(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const out = [];
  const press = key => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await wait(1000);
  out.push('startBoard=' + document.getElementById('start-leaderboard').textContent);
  out.push('resumeHidden=' + document.getElementById('resume-button').classList.contains('hidden'));
  document.getElementById('nick-input').value = 'offline';
  startGame('easy');
  await wait(1500);
  out.push('screen=' + state.screen + ' indicator=' + document.getElementById('save-status').textContent);
  press('p');
  await wait(500);
  out.push('pause=' + state.screen);
  press('Enter');
  await wait(3500);
  out.push('resumed=' + state.screen);
  endGame(false);
  await wait(1000);
  out.push('msg=' + document.getElementById('score-message').textContent);
  out.push('endBoard=' + document.getElementById('end-leaderboard').textContent);
  out.push('errors=' + window.__errors.length + ' ' + window.__errors.join('|'));
  document.body.dataset.result = out.join(';');
})();
```

- [ ] **Step 2: Uruchom scenariusz offline**

```bash
cd "$P" && node "$S/make-harness.mjs" . "$S/e2e-offline.js" "$S/e2e-offline.html" --offline \
  && "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --virtual-time-budget=20000 --dump-dom "file:///$S/e2e-offline.html" 2>/dev/null | grep -o 'data-result="[^"]*"'
```
Expected: `startBoard=Ranking niedostępny – brak połączenia;resumeHidden=true;screen=play indicator=○ gra bez rankingu i zapisu;pause=pause;resumed=play;msg=Nie udało się zapisać wyniku w rankingu;endBoard=Ranking niedostępny – brak połączenia;errors=0`
(Przeglądarka zaloguje nieudane pobranie skryptu z CDN — to błąd sieci, nie błąd JS; `__errors` go nie liczy.)
Jeśli coś nie przejdzie — popraw `game.js`/`db.js` tak, by żaden błąd nie przerywał gry, uruchom ponownie wszystkie e2e i testy Node, zrób commit „Poprawka trybu offline”.

- [ ] **Step 3: Zaktualizuj `wymagania.md`**

a) Nagłówek: `**Status:** do zatwierdzenia` → `**Status:** zatwierdzone; rozszerzone 2026-10-13 o ranking i wznawianie gry (Supabase)`.

b) Sekcja 1, punkt „Działa od razu” — zastąp całą linię:

```markdown
- **Działa od razu** — otwarcie pliku `index.html` dwuklikiem w przeglądarce uruchamia grę. Bez instalacji, bez serwera, bez kroku budowania. Wspólny ranking i wznawianie gry wymagają internetu; bez niego gra działa w pełni, tylko bez tych dwóch funkcji.
```

c) Sekcja 2, „Wchodzi w zakres” — dopisz na końcu listy:

```markdown
- Pauza z zapisem stanu gry i wznawianie przerwanej rozgrywki
- Wspólny ranking wyników (top 10 na każdy poziom) — dane w bazie Supabase (usługa w chmurze)
- Opcjonalne konto gracza (login + hasło), które zachowuje wyniki i zapis gry na innych komputerach
```

d) Sekcja 2, tabela „Świadomie POZA zakresem” — usuń wiersze „Zapis najlepszego wyniku (localStorage)” i „Pauza”; zastąp dwa wiersze:

```markdown
| Tryb wieloosobowy, logowanie mailem, odzyskiwanie hasła | Konto z loginem i hasłem jest opcjonalne; zapomniane hasło resetuje administrator w panelu Supabase |
| Własny backend (serwer) | Baza działa jako usługa w chmurze (Supabase), gra łączy się z nią bezpośrednio |
```

e) Sekcja 5 — zastąp tabelę i akapit pod nią:

```markdown
| Klawisz | Działanie |
|---|---|
| ↑ / ↓ / ← / → | Zmiana kierunku ruchu |
| W / S / A / D | To samo (alternatywa dla lewej ręki) |
| P lub Esc | Podczas gry: pauza z zapisem. Na ekranie pauzy: wznowienie |
| Enter lub spacja | Na ekranie startowym: start gry na poziomie **Średnim**. Na ekranie pauzy: wznowienie. Na ekranie końca gry: powrót do ekranu startowego |

Ruch węża sterowany jest wyłącznie klawiaturą. Wybór konkretnego poziomu trudności następuje myszką (kliknięcie przycisku); Enter/spacja to skrót omijający ten wybór. Gdy kursor jest w polu nicku, litery i spacja trafiają do pola — grę startuje wtedy tylko Enter. W polach formularza konta żaden klawisz nie steruje grą; Enter wysyła formularz.
```

f) Sekcja 6 — zastąp zdanie wstępne i podsekcje 6.1–6.3:

```markdown
Gra ma pięć stanów, przełączanych w obrębie jednej strony (bez przeładowania): ekran startowy, rozgrywka, pauza, odliczanie, koniec gry.

### 6.1 Ekran startowy
- Ilustracja węża z jabłkiem nad tytułem (SVG wbudowane w HTML)
- Tytuł gry: **Wężoidy**
- Gracz bez konta: pole „Twój nick” (3–16 znaków, nicki mogą się powtarzać; po powrocie na stronę uzupełnione poprzednim nickiem) oraz odnośniki **Załóż konto** / **Zaloguj**
- Formularz konta: login, hasło, informacja o przeniesieniu (rejestracja) lub nieprzenoszeniu (logowanie) wyników gry bez konta, komunikat błędu
- Gracz z kontem: „Zalogowano jako *login* ✓” i **Wyloguj** — gra startuje bez wpisywania nicku
- Trzy przyciski poziomu trudności: **Łatwy / Średni / Trudny** — kliknięcie rozpoczyna grę natychmiast (bez poprawnego nicku pojawia się komunikat pod polem)
- Przycisk **Wznów grę (poziom, wynik)** — tylko gdy istnieje zapis przerwanej gry
- Krótka informacja o sterowaniu (jedna linia)
- Ranking top 10 z przełącznikiem poziomów

### 6.2 Rozgrywka
- Plansza 20 × 20
- Licznik punktów widoczny nad planszą
- Nazwa aktualnego poziomu trudności widoczna obok wyniku
- Wskaźnik zapisu („● zapisano” / „○ brak zapisu” / „○ gra bez rankingu i zapisu”)
- Podpowiedź „P / Esc = pauza”

### 6.3 Ekran końca gry
- Napis "Koniec gry" (lub "Wygrana!" przy wypełnieniu planszy)
- Osiągnięty wynik
- Ranking top 10 rozegranego poziomu z wyróżnionym wierszem gracza; komunikat, jeśli wyniku nie udało się zapisać
- Przycisk **Zagraj ponownie** — wraca do ekranu startowego, gdzie można zmienić poziom trudności

### 6.4 Pauza
- Nakładka na planszy: napis „Pauza”, przyciski **Wznów** i **Wyjdź do menu** (zapis gry zostaje)
- Włącza się klawiszem P / Esc oraz automatycznie po przełączeniu karty lub zminimalizowaniu okna

### 6.5 Odliczanie
- Przy wznowieniu (z pauzy lub z ekranu startowego) nad planszą pojawia się odliczanie 3‑2‑1, potem wąż rusza

### 6.6 Ranking, zapis gry i konta
- Każda zakończona gra trafia do rankingu; ranking pokazuje najlepszy wynik każdego gracza, osobno dla każdego poziomu
- Jeden zapis przerwanej gry na gracza; zapis automatyczny co 5 s oraz przy pauzie
- Nowa gra i koniec gry usuwają zapis
- Gracz bez konta identyfikowany jest anonimową sesją Supabase zapamiętaną w przeglądarce — wznowienie działa na tym samym komputerze i w tej samej przeglądarce
- Konto (opcjonalne): login 3–16 znaków (litery bez polskich znaków, cyfry, `_`, `-`; małe litery), hasło min. 6 znaków; login jest unikalny wśród kont i widnieje w rankingu ze znakiem ✓
- Założenie konta w trakcie gry bez konta przenosi na konto dotychczasowe wyniki i zapis gry; logowanie na istniejące konto ich nie przenosi
- Brak odzyskiwania hasła — reset wykonuje administrator w panelu Supabase
```

g) Sekcja 8.1 — zastąp blok struktury i zdanie pod nim:

````markdown
```
index.html             — struktura strony: ekrany, pole nicku, ranking, nakładki pauzy i odliczania
style.css              — cały wygląd
game.js                — cała logika gry
db.js                  — komunikacja z bazą Supabase (ranking, zapis gry)
supabase/schema.sql    — struktura bazy: tabele, widok rankingu, reguły RLS
supabase/konta.sql     — migracja: opcjonalne konta (login + hasło)
supabase/test-rls.mjs  — test reguł dostępu na prawdziwym projekcie (node supabase/test-rls.mjs)
tests/                 — testy funkcji bez DOM (node --test "tests/*.test.js")
```

Bez plików konfiguracyjnych i bez `package.json`. Jedyna zależność zewnętrzna: biblioteka `supabase-js` ładowana z CDN (cdn.jsdelivr.net).
````

h) Sekcja 8.3 — po punkcie 4 dopisz punkt, a na końcu listy kolejny:

```markdown
4a. **Zapis stanu gry** — sprawdzenie nicku, zamiana stanu gry na zapis i z powrotem, walidacja zapisu z bazy (bez dostępu do DOM)
```

```markdown
8. **Baza w tle, pauza i wznawianie** — kolejka operacji na bazie, automatyczny zapis, pauza, odliczanie, ranking na ekranach
```

i) Sekcja 8.4 — zastąp pierwszy punkt:

```markdown
- Działa po otwarciu `index.html` z dysku (protokół `file://`) — bez serwera lokalnego; ranking i zapis gry wymagają internetu
```

j) Sekcja 9 — zastąp punkty 1, 9 i 12 oraz dopisz 13–19:

```markdown
1. Otwarcie `index.html` dwuklikiem pokazuje ekran startowy z polem nicku, trzema poziomami trudności i rankingiem.
```

```markdown
9. Przycisk "Zagraj ponownie" pozwala rozpocząć nową grę z wyborem poziomu, bez odświeżania strony.
```

```markdown
12. W konsoli przeglądarki nie pojawiają się błędy JavaScript w trakcie pełnej rozgrywki — także bez internetu (dopuszczalny jest wyłącznie komunikat przeglądarki o nieudanym pobraniu biblioteki z CDN).
13. Gra nie startuje bez nicku o długości 3–16 znaków — pod polem pojawia się komunikat.
14. Po zakończeniu gry wynik trafia do rankingu poziomu; ranking pokazuje top 10, każdego gracza raz, z najlepszym wynikiem; wiersz gracza jest wyróżniony.
15. P / Esc zatrzymuje grę i pokazuje pauzę; „Wznów” uruchamia odliczanie 3‑2‑1, po którym gra toczy się dalej z zachowanym stanem.
16. Po odświeżeniu strony lub zamknięciu karty w trakcie gry ekran startowy pokazuje „Wznów grę (poziom, wynik)”; wznowienie odtwarza węża, owoc, kierunek i wynik sprzed najwyżej ok. 5 sekund.
17. Przełączenie karty lub zminimalizowanie okna podczas gry włącza pauzę.
18. Bez internetu gra działa; ranking pokazuje „Ranking niedostępny – brak połączenia”.
19. Nowa gra i koniec gry usuwają zapis — przycisk „Wznów” znika.
20. „Załóż konto” w trakcie gry bez konta tworzy konto z loginem i hasłem; dotychczasowe wyniki zostają i mają w rankingu znak ✓.
21. Po wylogowaniu i zalogowaniu (także na innym komputerze) gracz widzi swoje wyniki w rankingu i może wznowić zapisaną grę.
22. Zajęty login, zły login/hasło, za krótkie hasło i login z polskimi znakami dają czytelny komunikat w formularzu.
```

- [ ] **Step 4: Pełna weryfikacja przed commitem**

Run (po kolei): `node --test "tests/*.test.js"`; `node supabase/test-rls.mjs | tail -1`; e2e: smoke (Task 3), ranking (Task 4), pauza (Task 5), konta (Task 6), offline (Task 7).
Expected: wszystkie zgodne z oczekiwaniami z poprzednich kroków, `errors=0` wszędzie, `WYNIK: 38 PASS, 0 FAIL`.

- [ ] **Step 5: Commit i publikacja gałęzi**

```bash
cd "$P" && git add wymagania.md && git commit -m "Wymagania: ranking, pauza i wznawianie gry (Supabase)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin feat/supabase
```

Utwórz PR (`gh pr create --base main --head feat/supabase`) z opisem zmian, wynikami testów i stopką `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge wykonuje użytkownik.**

- [ ] **Step 6: Po merge — weryfikacja na GitHub Pages**

```bash
cd "$P" && git switch main && git pull --ff-only \
  && for f in "" db.js game.js; do curl -s -o /dev/null -w "$f %{http_code}\n" "https://kristopheraiwork-spec.github.io/gra-snake/$f"; done
```
Expected: trzy odpowiedzi `200` (po 1–2 min od merge). Poproś użytkownika o ręczny test na dwóch przeglądarkach (dwóch graczy, wspólny ranking) zgodnie ze spec §6.4.

- [ ] **Step 7: Sprzątanie danych testowych (wykonuje użytkownik w SQL Editor)**

Przekaż użytkownikowi zapytanie (usuwa konta i sesje testowe; gracze, wyniki i zapisy znikają kaskadowo — klucze obce mają `on delete cascade`):

```sql
delete from auth.users
where id in (
  select id from public.players
  where nick like 'test-%' or nick like 'gosc-%' or nick = 'podglad'
);
```
