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
