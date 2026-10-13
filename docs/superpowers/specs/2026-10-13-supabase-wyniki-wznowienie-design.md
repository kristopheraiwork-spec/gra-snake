# Projekt: wspólny ranking i wznawianie gry (Supabase)

**Data:** 2026-10-13
**Status:** zatwierdzony w rozmowie, do przeglądu w formie pisemnej
**Dotyczy:** gra „Wężoidy” (`index.html`, `style.css`, `game.js`), hostowana na GitHub Pages

---

## 1. Cel i decyzje

Gra zapisuje wyniki do **wspólnego rankingu** widocznego dla wszystkich uczestników szkolenia oraz pozwala **wznowić przerwaną rozgrywkę**. Obie funkcje korzystają z bazy w chmurze Supabase.

| Decyzja | Wybór |
|---|---|
| Gdzie są dane | Supabase, projekt `geudeqgbhjrlnuzantvh` — zarówno wyniki, jak i zapis przerwanej gry |
| Tożsamość gracza | Nick wpisywany przed grą + anonimowa sesja Supabase w tle (bez haseł i maili) |
| Unikalność nicku | Brak — nicki mogą się powtarzać |
| Przerwanie gry | Klawisz `P` / `Esc` (pauza z zapisem) + automatyczny zapis co 5 s + automatyczna pauza po ukryciu karty |
| Zapisy gry | Jeden na gracza; nowa gra usuwa stary zapis; koniec gry usuwa zapis i dodaje wynik |
| Wznowienie | Przycisk na ekranie startowym, potem odliczanie 3‑2‑1 |
| Ranking | Osobny dla każdego poziomu, top 10, jedno (najlepsze) miejsce na gracza |
| Komunikacja z bazą | Oficjalna biblioteka `supabase-js` z CDN (cdn.jsdelivr.net) |

### Zmiany w dotychczasowych wymaganiach

Projekt świadomie zmienia następujące zapisy w `wymagania.md`:

- pkt 2 „Poza zakresem”: usunięte pozycje *zapis najlepszego wyniku*, *pauza*, *zapis stanu*, *backend, baza danych* (baza jako usługa w chmurze, bez własnego serwera);
- pkt 1 i 8.4: gra nadal działa z `file://` i offline, ale ranking i wznowienie wymagają internetu;
- pkt 8.1: dochodzą `db.js`, `supabase/schema.sql` oraz zależność `supabase-js` z CDN;
- pkt 5, 6 i 9: nowe sterowanie (pauza), nowe ekrany i kryteria akceptacji.

---

## 2. Model danych

### `players` — gracze

| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | uuid, PK | = `auth.uid()` anonimowej sesji; FK do `auth.users` |
| `nick` | text | 3–16 znaków, bez spacji na początku i końcu; **nie** musi być unikalny |
| `created_at` | timestamptz | domyślnie `now()` |

### `scores` — wszystkie zakończone gry (pełna historia)

| Kolumna | Typ | Uwagi |
|---|---|---|
| `id` | bigint, autonumer, PK | |
| `player_id` | uuid → `players.id` | domyślnie `auth.uid()` |
| `level` | text | `easy` / `medium` / `hard` |
| `score` | int | 0–397 (400 komórek − 3 segmenty startowe) |
| `created_at` | timestamptz | domyślnie `now()` |

### `saved_games` — zapis przerwanej gry, jeden na gracza

| Kolumna | Typ | Uwagi |
|---|---|---|
| `player_id` | uuid, PK → `players.id` | PK wymusza jeden zapis na gracza; zapis = upsert |
| `level` | text | jak wyżej |
| `snake` | jsonb | tablica `{x, y}` w formacie `state.snake`, 3–400 elementów |
| `fruit` | jsonb | `{x, y}` |
| `direction` | text | `up` / `down` / `left` / `right` |
| `score` | int | warunek: `score = długość snake − 3` |
| `updated_at` | timestamptz | ustawiane przez trigger przy każdym zapisie |

### `leaderboard` — widok rankingu

Najlepszy wynik każdego gracza na każdym poziomie, pierwsze 10 miejsc per poziom. Kolumny: `level`, `position`, `nick`, `score`, `created_at`, `player_id` (do wyróżnienia własnego wiersza). Przy remisie wyżej jest wynik osiągnięty wcześniej.

Świadomie pominięte: czas gry, liczba pauz, statystyki.

---

## 3. Reguły dostępu (RLS)

Klucz publiczny Supabase jest jawny w kodzie strony. Dane chroni RLS włączone na wszystkich tabelach; czego reguła nie dopuszcza — jest zabronione.

| Tabela | Odczyt | Dodawanie | Zmiana | Usuwanie |
|---|---|---|---|---|
| `players` | wszyscy | własny wiersz | tylko własny `nick` | nikt |
| `scores` | wszyscy | z własnym `player_id` | nikt | nikt |
| `saved_games` | własny | własny | własny | własny |
| `leaderboard` | wszyscy (także bez sesji) | – | – | – |

- Widok `leaderboard` z `security_invoker = true` — respektuje RLS tabel źródłowych.
- Rola `anon` (brak sesji) ma tylko odczyt; zapis wymaga sesji (anonimowy użytkownik ma rolę `authenticated`).
- Ograniczenia CHECK z sekcji 2 działają niezależnie od RLS.

**Ustawienia panelu Supabase (poza SQL):**
1. Włączyć logowanie anonimowe (Authentication → Sign In / Providers → Anonymous).
2. Przed szkoleniem podnieść limit anonimowych logowań na IP (Authentication → Rate Limits) — sala zwykle wychodzi do internetu z jednego adresu.

**Znane ograniczenie:** wynik liczy przeglądarka, więc zdeterminowany uczestnik może wysłać zawyżony wynik w dopuszczalnym zakresie. Fałszywki usuwa administrator w panelu.

---

## 4. Zmiany w grze

### Pliki

| Plik | Zmiana |
|---|---|
| `db.js` (nowy) | konfiguracja (URL projektu, klucz publiczny) i funkcje: `initDb`, `ensurePlayer(nick)`, `saveGame(state)`, `loadSavedGame()`, `deleteSavedGame()`, `addScore(level, score)`, `getLeaderboard(level)`; każda zwraca wynik albo `null` przy błędzie, nigdy nie rzuca wyjątku do gry |
| `game.js` | logika ruchu bez zmian; dochodzą pauza, odliczanie, przywracanie stanu i wywołania `db.js` |
| `index.html` | `supabase-js` z CDN, `db.js`, pole nicku, przycisk „Wznów”, ranking, ekran pauzy, odliczanie |
| `style.css` | style nowych elementów w obecnej palecie |
| `supabase/schema.sql` (nowy) | tabele, widok, ograniczenia, RLS |
| `wymagania.md` | aktualizacja zgodnie z sekcją 1 |

### Ekrany

- **Startowy:** ilustracja, tytuł, pole „Twój nick” (zapamiętane), przyciski poziomów, przycisk „Wznów grę (poziom, wynik)” tylko przy istniejącym zapisie, ranking top 10 z przełącznikiem poziomów.
- **Rozgrywka:** jak dotąd + podpowiedź „P / Esc = pauza” + wskaźnik zapisu („● zapis” / „○ brak zapisu”).
- **Pauza (nowy):** plansza w tle, przyciski „Wznów” i „Wyjdź do menu” (zapis zostaje).
- **Odliczanie:** 3‑2‑1 nad planszą przy wznowieniu.
- **Koniec gry:** wynik, top 10 rozegranego poziomu z wyróżnionym wierszem gracza, „Zagraj ponownie”.

### Przepływ

1. **Wejście na stronę:** ranking ładowany bez logowania. Jeśli istnieje sesja — nick jest uzupełniany i sprawdzany jest zapis do wznowienia.
2. **Nowa gra:** wymaga nicku 3–16 znaków. Przy pierwszej grze: anonimowe logowanie + utworzenie gracza (logowanie dopiero przy starcie, nie przy wejściu, żeby oszczędzać limit). Zmiana nicku aktualizuje `players.nick`. Stary zapis gry jest usuwany.
3. **W trakcie gry:** automatyczny zapis co 5 s, niezależny od pętli ruchu; jeśli poprzedni zapis trwa, kolejny jest pomijany.
4. **Pauza:** `P` / `Esc` lub ukrycie karty (`visibilitychange`) — zatrzymanie pętli, zapis, ekran pauzy.
5. **Wznowienie:** wczytanie i walidacja zapisu → odtworzenie stanu → plansza → 3‑2‑1 → pętla gry.
6. **Koniec gry:** usunięcie zapisu, dodanie wyniku, pobranie rankingu poziomu, wyróżnienie miejsca gracza.

### Klawiatura

Gdy fokus jest w polu nicku, litery i spacja trafiają do pola, nie do gry. Enter w polu nicku = start na poziomie Średnim. Podczas gry `P` / `Esc` = pauza; na ekranie pauzy Enter / spacja = wznów.

---

## 5. Obsługa błędów

Zasada: **gra zawsze działa**, baza jest dodatkiem.

| Sytuacja | Zachowanie |
|---|---|
| Brak internetu / nie wczytano `supabase-js` | gra jak dotąd; „Ranking niedostępny – brak połączenia”; brak przycisku „Wznów”; pauza bez zapisu |
| Nieudane logowanie anonimowe | komunikat „Gra bez rankingu i zapisu”, gra startuje |
| Nieudany automatyczny zapis | cicho, ponowna próba za 5 s; wskaźnik „○ brak zapisu” |
| Nieudany zapis wyniku | ekran końcowy: „Nie udało się zapisać wyniku w rankingu”; bez ponawiania |
| Niepoprawny zapis gry (współrzędne poza planszą, zły kierunek, owoc na wężu, niespójny wynik) | zapis usuwany, przycisk „Wznów” znika |
| Wyczyszczone dane przeglądarki | nowy anonimowy gracz; stary zapis niedostępny, stare wyniki zostają w rankingu |

---

## 6. Testy

1. **Funkcje bez DOM** (walidacja zapisu, konwersja stanu ↔ zapis) — testy pisane przed implementacją, uruchamiane w Node.
2. **RLS na prawdziwym projekcie** — skrypt z dwoma anonimowymi graczami: B nie widzi zapisu A; B nie doda wyniku z ID A; wynik 500 i zapis z niespójnym wynikiem odrzucone; wyników nie da się zmienić ani usunąć; `anon` nie może zapisywać.
3. **Przeglądarka (headless Chrome):** nick → gra → pauza → odświeżenie → „Wznów” → odliczanie → koniec → wynik w rankingu; scenariusz offline (zablokowany CDN) — gra działa, brak błędów w konsoli.
4. **Ręcznie na GitHub Pages:** dwie przeglądarki, dwóch graczy we wspólnym rankingu.

---

## 7. Wdrożenie

1. Wgranie `supabase/schema.sql` do projektu (konektor Supabase lub SQL Editor).
2. Ustawienia panelu: logowanie anonimowe, limit logowań; przekazanie klucza publicznego (`publishable` / `anon`, nigdy `service_role` / `secret`).
3. Kod na gałęzi `feat/supabase` → PR → merge → automatyczna aktualizacja GitHub Pages.
