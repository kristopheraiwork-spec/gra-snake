// =====================================================================
// BAZA DANYCH (Supabase) — wspólny ranking, zapis przerwanej gry, konta
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
      // Konta nie zamieniamy po cichu w gościa — gracz zaloguje się ponownie.
      const session = await currentSession();
      if (session && !session.user.is_anonymous) throw error;
      // Gość: jedna próba z nową sesją; zwykły błąd sieci nie kasuje tożsamości gracza.
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
