-- =====================================================================
-- Wężoidy — struktura bazy Supabase: ranking i wznawianie gry
-- Projekt: docs/superpowers/specs/2026-10-13-supabase-wyniki-wznowienie-design.md
-- Skrypt dla czystego projektu (uruchamiany jednorazowo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABELE
-- ---------------------------------------------------------------------

-- Gracze: id = anonimowa sesja Supabase. Nicki mogą się powtarzać.
create table public.players (
  id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nick       text not null check (char_length(nick) between 3 and 16 and nick = btrim(nick)),
  created_at timestamptz not null default now()
);

-- Wszystkie zakończone gry (pełna historia). 397 = 400 komórek - 3 segmenty startowe.
create table public.scores (
  id         bigint generated always as identity primary key,
  player_id  uuid not null default auth.uid() references public.players (id) on delete cascade,
  level      text not null check (level in ('easy', 'medium', 'hard')),
  score      integer not null check (score between 0 and 397),
  created_at timestamptz not null default now()
);

create index scores_level_player_score_idx on public.scores (level, player_id, score desc);

-- Zapis przerwanej gry: klucz główny = gracz, więc jeden zapis na gracza.
create table public.saved_games (
  player_id  uuid primary key default auth.uid() references public.players (id) on delete cascade,
  level      text not null check (level in ('easy', 'medium', 'hard')),
  snake      jsonb not null check (jsonb_typeof(snake) = 'array' and jsonb_array_length(snake) between 3 and 400),
  fruit      jsonb not null check (jsonb_typeof(fruit) = 'object'),
  direction  text not null check (direction in ('up', 'down', 'left', 'right')),
  score      integer not null check (score between 0 and 397),
  updated_at timestamptz not null default now(),
  -- Wynik musi zgadzać się z długością węża (każdy owoc = +1 segment).
  constraint saved_games_score_matches_length check (score = jsonb_array_length(snake) - 3)
);

-- updated_at ustawia baza, nie zegar przeglądarki.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger saved_games_set_updated_at
  before insert or update on public.saved_games
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. RANKING
-- ---------------------------------------------------------------------

-- Najlepszy wynik gracza na poziomie, top 10 per poziom.
-- Przy remisie wyżej jest wynik osiągnięty wcześniej.
create view public.leaderboard
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
select r.level, r.position, p.nick, r.score, r.created_at, r.player_id
from ranked r
join public.players p on p.id = r.player_id
where r.position <= 10;

-- ---------------------------------------------------------------------
-- 3. UPRAWNIENIA I RLS
-- Klucz publiczny jest jawny w kodzie strony — dane chroni RLS.
-- anon = brak sesji (tylko odczyt), authenticated = anonimowa sesja gracza.
-- ---------------------------------------------------------------------

alter table public.players     enable row level security;
alter table public.scores      enable row level security;
alter table public.saved_games enable row level security;

-- Uprawnienia na poziomie kolumn i operacji (druga linia obrony obok RLS).
revoke all on public.players, public.scores, public.saved_games, public.leaderboard from anon, authenticated;

grant select on public.players, public.scores, public.leaderboard to anon, authenticated;
grant insert (id, nick) on public.players to authenticated;
grant update (nick) on public.players to authenticated;
grant insert (player_id, level, score) on public.scores to authenticated;
grant select, insert, update, delete on public.saved_games to authenticated;

-- players: wszyscy czytają (nick w rankingu), każdy tworzy i zmienia tylko siebie.
create policy "players: odczyt dla wszystkich"
  on public.players for select
  to anon, authenticated
  using (true);

create policy "players: dodanie własnego wiersza"
  on public.players for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "players: zmiana własnego nicku"
  on public.players for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- scores: wszyscy czytają, dodać można tylko własny wynik; bez zmian i usuwania.
create policy "scores: odczyt dla wszystkich"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "scores: dodanie własnego wyniku"
  on public.scores for insert
  to authenticated
  with check (player_id = (select auth.uid()));

-- saved_games: wyłącznie własny zapis, we wszystkich operacjach.
create policy "saved_games: tylko własny zapis"
  on public.saved_games for all
  to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()));
