const URL = 'https://geudeqgbhjrlnuzantvh.supabase.co';
const KEY = 'sb_publishable_AQdcMJa_MDniVulQEN1ShQ_jrp3mKHD';
let pass = 0, fail = 0;
function check(name, ok, info = '') { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + info)); }
async function rest(path, { method = 'GET', token, body, prefer } = {}) {
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(URL + '/rest/v1/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}
async function signIn() {
  const r = await fetch(URL + '/auth/v1/signup', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: '{}' });
  const d = await r.json();
  if (!d.access_token) throw new Error('Anonimowe logowanie nieudane: ' + r.status + ' ' + JSON.stringify(d));
  return { token: d.access_token, id: d.user.id };
}
const ok2xx = r => r.status >= 200 && r.status < 300;
const snake3 = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];

// --- bez sesji (anon) ---
let r = await rest('leaderboard?select=*&limit=1');
check('anon: odczyt widoku leaderboard (tabele istnieją)', r.status === 200, JSON.stringify(r));
for (const t of ['players', 'scores']) { r = await rest(t + '?select=*&limit=1'); check('anon: odczyt ' + t, r.status === 200, JSON.stringify(r)); }
r = await rest('saved_games?select=*'); check('anon: brak dostępu do saved_games', !ok2xx(r) || (Array.isArray(r.data) && r.data.length === 0), JSON.stringify(r));
r = await rest('scores', { method: 'POST', body: { level: 'easy', score: 1 } }); check('anon: nie może dodać wyniku', !ok2xx(r), JSON.stringify(r));

// --- dwóch anonimowych graczy ---
const A = await signIn(), B = await signIn();
check('logowanie anonimowe działa (2 sesje)', !!A.token && !!B.token);
r = await rest('players', { method: 'POST', token: A.token, body: { nick: 'test-a' } }); check('A: utworzenie gracza', ok2xx(r), JSON.stringify(r));
r = await rest('players', { method: 'POST', token: B.token, body: { nick: 'test-b' } }); check('B: utworzenie gracza', ok2xx(r), JSON.stringify(r));
r = await rest('players', { method: 'POST', token: B.token, body: { id: A.id, nick: 'podszywka' } }); check('B: nie utworzy gracza z ID A', !ok2xx(r), JSON.stringify(r));
r = await rest('players', { method: 'POST', token: A.token, body: { nick: 'ab' } }); check('nick za krótki odrzucony', !ok2xx(r), JSON.stringify(r));

r = await rest('saved_games', { method: 'POST', token: A.token, body: { level: 'medium', snake: snake3, fruit: {x:1,y:1}, direction: 'right', score: 0 } }); check('A: zapis gry', ok2xx(r), JSON.stringify(r));
r = await rest('saved_games', { method: 'POST', token: A.token, prefer: 'resolution=merge-duplicates', body: { level: 'medium', snake: [...snake3, {x:7,y:10}], fruit: {x:2,y:2}, direction: 'up', score: 1 } }); check('A: nadpisanie zapisu (upsert)', ok2xx(r), JSON.stringify(r));
r = await rest('saved_games?select=*', { token: A.token }); check('A: widzi własny zapis (1 wiersz, wynik 1)', Array.isArray(r.data) && r.data.length === 1 && r.data[0].score === 1, JSON.stringify(r));
r = await rest('saved_games?select=*', { token: B.token }); check('B: nie widzi zapisu A', Array.isArray(r.data) && r.data.length === 0, JSON.stringify(r));
r = await rest('saved_games?player_id=eq.' + A.id, { method: 'DELETE', token: B.token, prefer: 'return=representation' }); check('B: nie usunie zapisu A', Array.isArray(r.data) && r.data.length === 0, JSON.stringify(r));
r = await rest('saved_games', { method: 'POST', token: B.token, body: { level: 'easy', snake: snake3, fruit: {x:1,y:1}, direction: 'right', score: 5 } }); check('zapis z wynikiem niezgodnym z długością węża odrzucony', !ok2xx(r), JSON.stringify(r));
r = await rest('saved_games', { method: 'POST', token: B.token, body: { level: 'easy', snake: snake3, fruit: {x:1,y:1}, direction: 'diagonal', score: 0 } }); check('zły kierunek odrzucony', !ok2xx(r), JSON.stringify(r));

r = await rest('scores', { method: 'POST', token: B.token, body: { player_id: A.id, level: 'easy', score: 3 } }); check('B: nie doda wyniku z ID A', !ok2xx(r), JSON.stringify(r));
r = await rest('scores', { method: 'POST', token: B.token, body: { level: 'easy', score: 500 } }); check('wynik 500 odrzucony', !ok2xx(r), JSON.stringify(r));
r = await rest('scores', { method: 'POST', token: B.token, body: { level: 'expert', score: 1 } }); check('nieznany poziom odrzucony', !ok2xx(r), JSON.stringify(r));
r = await rest('scores', { method: 'POST', token: B.token, body: { level: 'easy', score: 5 } }); check('B: dodanie własnego wyniku', ok2xx(r), JSON.stringify(r));
r = await rest('scores', { method: 'POST', token: B.token, body: { level: 'easy', score: 2 } }); check('B: drugi (gorszy) wynik', ok2xx(r), JSON.stringify(r));
r = await rest('scores?player_id=eq.' + B.id, { method: 'PATCH', token: B.token, body: { score: 397 } }); check('B: nie zmieni własnego wyniku', !ok2xx(r), JSON.stringify(r));
r = await rest('scores?player_id=eq.' + B.id, { method: 'DELETE', token: B.token, prefer: 'return=representation' }); check('B: nie usunie własnego wyniku', !ok2xx(r) || (Array.isArray(r.data) && r.data.length === 0), JSON.stringify(r));
r = await rest('players?id=eq.' + A.id, { method: 'PATCH', token: B.token, prefer: 'return=representation', body: { nick: 'zmienione' } }); check('B: nie zmieni nicku A', Array.isArray(r.data) && r.data.length === 0, JSON.stringify(r));
r = await rest('players?id=eq.' + B.id, { method: 'PATCH', token: B.token, prefer: 'return=representation', body: { nick: 'test-b2' } }); check('B: zmiana własnego nicku', ok2xx(r) && r.data.length === 1, JSON.stringify(r));

r = await rest('leaderboard?level=eq.easy&player_id=eq.' + B.id); check('ranking: B raz, z najlepszym wynikiem 5 i nowym nickiem', Array.isArray(r.data) && r.data.length === 1 && r.data[0].score === 5 && r.data[0].nick === 'test-b2', JSON.stringify(r));

r = await rest('saved_games?player_id=eq.' + A.id, { method: 'DELETE', token: A.token, prefer: 'return=representation' }); check('A: usunięcie własnego zapisu', ok2xx(r) && r.data.length === 1, JSON.stringify(r));
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
console.log(`\nWYNIK: ${pass} PASS, ${fail} FAIL`);
