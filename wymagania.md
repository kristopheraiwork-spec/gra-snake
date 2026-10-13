# Wymagania — gra "Wężoidy" (Snake)

**Data:** 2026-09-29
**Technologia:** HTML + CSS + JavaScript (bez frameworków); jedyna biblioteka: `supabase-js` (ranking, zapis gry, konta)
**Status:** zatwierdzone; rozszerzone 2026-10-13 o ranking, wznawianie gry i opcjonalne konta (Supabase)

---

## 1. Cel projektu

Gra ma służyć jako **demo szkoleniowe** na warsztatach Vibe Coding. Z tego wynikają priorytety:

- **Działa od razu** — otwarcie pliku `index.html` dwuklikiem w przeglądarce uruchamia grę. Bez instalacji, bez serwera, bez kroku budowania. Wspólny ranking, wznawianie gry i konta wymagają internetu; bez niego gra działa w pełni, tylko bez tych funkcji.
- **Kod czytelny do pokazania na ekranie** — krótkie funkcje o jednoznacznych nazwach, logika możliwa do objaśnienia na żywo.
- **Minimalny zakres** — każda funkcja, która nie jest potrzebna do zagrania w Węża, jest celowo pominięta.

Sukces = uczestnik szkolenia otwiera plik, gra bez instrukcji obsługi, a prowadzący jest w stanie objaśnić cały kod w kilkanaście minut.

---

## 2. Zakres

### Wchodzi w zakres

- Plansza o stałym rozmiarze, wąż, owoc, licznik punktów
- Trzy poziomy trudności wybierane przed startem
- Ekran startowy, rozgrywka, ekran końca gry z możliwością restartu
- Sterowanie klawiaturą
- Pauza z zapisem stanu gry i wznawianie przerwanej rozgrywki
- Wspólny ranking wyników (top 10 na każdy poziom) — dane w bazie Supabase (usługa w chmurze)
- Opcjonalne konto gracza (login + hasło), które zachowuje wyniki i zapis gry na innych komputerach

### Świadomie POZA zakresem

Poniższe zostały rozważone i odrzucone, żeby utrzymać demo proste:

| Pominięte | Uzasadnienie |
|---|---|
| Bonusowe owoce, przeszkody na planszy | Rozbudowuje logikę kolizji ponad potrzebę demo |
| Sterowanie dotykowe, tryb mobilny | Szkolenie odbywa się na komputerach |
| Dźwięki, animacje, efekty cząsteczkowe | Nie wpływają na rozgrywkę |
| Tryb wieloosobowy, logowanie mailem, odzyskiwanie hasła | Konto z loginem i hasłem jest opcjonalne; zapomniane hasło resetuje administrator w panelu Supabase |
| Własny backend (serwer) | Baza działa jako usługa w chmurze (Supabase), gra łączy się z nią bezpośrednio |

---

## 3. Zasady gry

1. Plansza to siatka **20 × 20 komórek**.
2. Wąż startuje na środku planszy, ma **długość 3 segmentów** i porusza się **w prawo**.
3. Wąż przesuwa się automatycznie o jedną komórkę w stałych odstępach czasu. Gracz zmienia tylko kierunek ruchu — nigdy nie zatrzymuje węża.
4. Na planszy zawsze znajduje się **dokładnie jeden owoc**, umieszczony losowo na komórce niezajętej przez węża.
5. Zjedzenie owocu (wejście głowy węża na komórkę z owocem):
   - wydłuża węża o **1 segment**,
   - zwiększa wynik o **1 punkt**,
   - powoduje pojawienie się nowego owocu w innym losowym wolnym miejscu.
6. **Ściany nie są śmiertelne.** Gdy głowa węża wyjdzie poza krawędź planszy, pojawia się po przeciwnej stronie, w tym samym wierszu lub kolumnie (wyjście prawą krawędzią = wejście lewą, górną = dolną itd.). Wąż nie traci życia ani punktów, ruch trwa nieprzerwanie; ciało podąża tą samą drogą.
7. **Gra kończy się**, gdy głowa węża wejdzie na komórkę zajmowaną przez własne ciało.
8. Wynik końcowy = liczba zjedzonych owoców.

### Przypadki brzegowe

| Sytuacja | Oczekiwane zachowanie |
|---|---|
| Gracz wciska kierunek przeciwny do aktualnego (np. w lewo, gdy wąż idzie w prawo) | Ruch jest **ignorowany** — wąż nie może zawrócić w siebie |
| Gracz wciska dwa kierunki w czasie jednej klatki (np. w górę, potem w lewo) | Uwzględniany jest tylko pierwszy poprawny kierunek w danej klatce; drugi nie może obrócić węża o 180° |
| Wąż zajmuje całą planszę (400 komórek) | Gra kończy się ekranem wygranej — nie ma gdzie umieścić owocu |
| Głowa węża wychodzi poza krawędź planszy | Pojawia się po przeciwnej stronie w tym samym wierszu/kolumnie; gra trwa dalej |
| Wąż przechodzi przez krawędź i po drugiej stronie stoi jego własne ciało | Gra się kończy — liczy się kolizja z ciałem, nie samo przejście przez krawędź |
| Owoc leży przy krawędzi i wąż dosięga go przez przejście na drugą stronę | Owoc zostaje zjedzony normalnie — przejście przez krawędź nie zmienia zasad jedzenia |
| Klawisze strzałek podczas rozgrywki | Nie przewijają strony (domyślne zachowanie przeglądarki jest blokowane) |

---

## 4. Poziomy trudności

Wybierane **przed startem** na ekranie startowym; obowiązują przez całą rozgrywkę (wąż nie przyspiesza w trakcie gry).

| Poziom | Odstęp między ruchami | Charakter |
|---|---|---|
| Łatwy | 200 ms | Spokojne tempo, dla pierwszego podejścia |
| Średni | 130 ms | Domyślny wybór |
| Trudny | 80 ms | Wymaga refleksu |

---

## 5. Sterowanie

| Klawisz | Działanie |
|---|---|
| ↑ / ↓ / ← / → | Zmiana kierunku ruchu |
| W / S / A / D | To samo (alternatywa dla lewej ręki) |
| P lub Esc | Podczas gry: pauza z zapisem. Na ekranie pauzy: wznowienie |
| Enter lub spacja | Na ekranie startowym: start gry na poziomie **Średnim**. Na ekranie pauzy: wznowienie. Na ekranie końca gry: powrót do ekranu startowego |

Ruch węża sterowany jest wyłącznie klawiaturą. Wybór konkretnego poziomu trudności następuje myszką (kliknięcie przycisku); Enter/spacja to skrót omijający ten wybór. Gdy kursor jest w polu nicku, litery i spacja trafiają do pola — grę startuje wtedy tylko Enter. W polach formularza konta żaden klawisz nie steruje grą; Enter wysyła formularz.

---

## 6. Ekrany i interfejs

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

---

## 7. Wygląd

Styl: **nowoczesny minimalizm**.

- Ciemne tło strony, plansza wyraźnie odcięta od tła
- Jeden kolor akcentu dla węża, kontrastowy kolor dla owocu
- Owoc rysowany jako płaskie jabłko (korpus w kolorze owocu, listek w kolorze akcentu)
- Głowa węża wizualnie odróżniona od reszty ciała (jaśniejszy odcień lub obramowanie) i ma dwoje oczu ustawionych od strony kierunku ruchu
- Segmenty węża lekko zaokrąglone, ostatni segment (ogon) mniejszy — wąż zwęża się ku końcowi
- Czytelna typografia bezszeryfowa, wynik jako największy element tekstowy
- Grafika jako SVG wbudowane w CSS/HTML; brak plików graficznych i zewnętrznych czcionek, żeby gra działała offline

---

## 8. Wymagania techniczne

### 8.1 Struktura plików

```
index.html             — struktura strony: ekrany, panel gracza, ranking, nakładki pauzy i odliczania
style.css              — cały wygląd
game.js                — cała logika gry
db.js                  — komunikacja z bazą Supabase (ranking, zapis gry, konta)
supabase/schema.sql    — struktura bazy: tabele, widok rankingu, reguły RLS
supabase/konta.sql     — migracja: opcjonalne konta (login + hasło)
supabase/test-rls.mjs  — test reguł dostępu na prawdziwym projekcie (node supabase/test-rls.mjs)
tests/                 — testy funkcji bez DOM (node --test "tests/*.test.js")
```

Bez plików konfiguracyjnych i bez `package.json`. Jedyna zależność zewnętrzna: biblioteka `supabase-js` ładowana z CDN (cdn.jsdelivr.net).

### 8.2 Renderowanie

Plansza to **siatka elementów HTML** (`<div>` w układzie CSS Grid), a nie `<canvas>`. Wybór podyktowany szkoleniem: stan gry widać bezpośrednio w inspektorze przeglądarki, a osoby znające HTML/CSS rozumieją rysowanie bez wprowadzania API Canvas.

- 400 komórek tworzonych jednorazowo przy starcie gry
- Przerysowanie polega na zmianie klas CSS istniejących komórek, a nie na kasowaniu i tworzeniu elementów od nowa

### 8.3 Organizacja kodu w `game.js`

Kod podzielony na wyraźnie oddzielone części, każda z jednym zadaniem:

1. **Stałe konfiguracyjne** — rozmiar planszy, prędkości poziomów trudności (zebrane na górze pliku, łatwe do zmiany na żywo podczas szkolenia)
2. **Stan gry** — pozycje segmentów węża, pozycja owocu, aktualny kierunek, wynik, aktualny ekran
3. **Pętla gry** — `setInterval` z odstępem zależnym od poziomu trudności; jedno wywołanie = jeden ruch węża
4. **Logika ruchu** — wyliczenie nowej pozycji głowy, zawinięcie współrzędnych przy krawędzi planszy (modulo rozmiaru siatki), wykrycie kolizji z ciałem, wydłużenie lub skrócenie węża
4a. **Zapis stanu gry** — sprawdzenie nicku i loginu, zamiana stanu gry na zapis i z powrotem, walidacja zapisu z bazy (bez dostępu do DOM)
5. **Obsługa klawiatury** — zamiana wciśniętego klawisza na kierunek, z blokadą zawracania
6. **Renderowanie** — przeniesienie stanu gry na klasy CSS komórek
7. **Przełączanie ekranów** — start, rozgrywka, pauza, odliczanie, koniec gry
8. **Baza w tle, pauza i wznawianie** — kolejka operacji na bazie, automatyczny zapis, pauza, odliczanie, ranking i konto na ekranach

Logika gry nie miesza się z renderowaniem: funkcje liczące ruch i kolizje nie dotykają DOM.

### 8.4 Środowisko

- Działa po otwarciu `index.html` z dysku (protokół `file://`) — bez serwera lokalnego; ranking, zapis gry i konta wymagają internetu
- Obsługiwane przeglądarki: aktualne wersje Chrome, Edge, Firefox
- Nowoczesny JavaScript (ES6+): `const`/`let`, funkcje strzałkowe. Moduły ES **nie** są używane, bo nie działają przez `file://`

---

## 9. Kryteria akceptacji

Gra jest gotowa, gdy wszystkie poniższe punkty są spełnione:

1. Otwarcie `index.html` dwuklikiem pokazuje ekran startowy z polem nicku, trzema poziomami trudności i rankingiem.
2. Kliknięcie poziomu uruchamia rozgrywkę, wąż rusza w prawo bez dodatkowej akcji gracza.
3. Strzałki i klawisze WASD zmieniają kierunek węża.
4. Próba zawrócenia o 180° nie kończy gry — ruch jest ignorowany.
5. Zjedzenie owocu wydłuża węża, zwiększa wynik o 1 i przenosi owoc w nowe losowe miejsce.
6. Owoc nigdy nie pojawia się na komórce zajętej przez węża.
7. Wyjście poza krawędź planszy **nie** kończy gry — wąż pojawia się po przeciwnej stronie i gra toczy się dalej, z zachowanym wynikiem.
8. Uderzenie we własne ciało kończy grę i pokazuje ekran końcowy z wynikiem.
9. Przycisk "Zagraj ponownie" pozwala rozpocząć nową grę z wyborem poziomu, bez odświeżania strony.
10. Wąż na poziomie trudnym porusza się wyraźnie szybciej niż na łatwym.
11. Strzałki nie przewijają strony podczas gry.
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
