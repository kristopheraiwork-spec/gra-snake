// db.js z atrapą klienta Supabase — bez sieci i bez prawdziwej bazy.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Atrapa: sesja podanego rodzaju, odczyt gracza kończy się błędem sesji.
function loadDbWithSessionProblem(isAnonymous) {
  const calls = { signOut: 0, signInAnonymously: 0 };
  const sessionProblem = { code: 'PGRST301', message: 'JWT expired' };
  const query = {
    select() { return query; },
    eq() { return query; },
    maybeSingle: async () => ({ data: null, error: sessionProblem }),
  };
  let session = { user: { id: 'u1', is_anonymous: isAnonymous } };
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      signOut: async () => { calls.signOut += 1; session = null; return { error: null }; },
      signInAnonymously: async () => {
        calls.signInAnonymously += 1;
        return { data: { session: { user: { id: 'u2', is_anonymous: true } } }, error: null };
      },
    },
    from: () => query,
  };
  const context = vm.createContext({
    window: { supabase: { createClient: () => client } },
    console: { warn() {} },
  });
  const code = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');
  vm.runInContext(code + '\n;globalThis.__db = { initDb, ensurePlayer, getPlayerId };', context);
  context.__db.initDb();
  return { db: context.__db, calls };
}

test('ensurePlayer: problem z sesją konta nie zamienia konta w gościa', async () => {
  const { db, calls } = loadDbWithSessionProblem(false);
  assert.equal(await db.ensurePlayer('ola'), false);
  assert.equal(calls.signOut, 0, 'konto nie może zostać po cichu wylogowane');
  assert.equal(calls.signInAnonymously, 0);
  assert.equal(db.getPlayerId(), null);
});

test('ensurePlayer: problem z sesją gościa — jedna próba z nową sesją', async () => {
  const { db, calls } = loadDbWithSessionProblem(true);
  await db.ensurePlayer('ola');
  assert.equal(calls.signOut, 1);
  assert.equal(calls.signInAnonymously, 1);
});
