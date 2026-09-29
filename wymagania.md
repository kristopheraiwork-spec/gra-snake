# Wymagania — gra "Wąż" (Snake)

**Data:** 2026-09-29
**Technologia:** HTML + CSS + JavaScript (bez frameworków i bibliotek)
**Status:** do zatwierdzenia

---

## 1. Cel projektu

Gra ma służyć jako **demo szkoleniowe** na warsztatach Vibe Coding. Z tego wynikają priorytety:

- **Działa od razu** — otwarcie pliku `index.html` dwuklikiem w przeglądarce uruchamia grę. Bez instalacji, bez serwera, bez kroku budowania.
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

### Świadomie POZA zakresem

Poniższe zostały rozważone i odrzucone, żeby utrzymać demo proste:

| Pominięte | Uzasadnienie |
|---|---|
| Zapis najlepszego wyniku (localStorage) | Dodaje stan poza grą, niepotrzebny do pokazania mechaniki |
| Pauza | Rozgrywka trwa krótko, restart wystarcza |
| Bonusowe owoce, przeszkody na planszy | Rozbudowuje logikę kolizji ponad potrzebę demo |
| Sterowanie dotykowe, tryb mobilny | Szkolenie odbywa się na komputerach |
| Dźwięki, animacje, efekty cząsteczkowe | Nie wpływają na rozgrywkę |
| Tryb wieloosobowy, zapis stanu, konta | Poza charakterem demo |
| Backend, baza danych | Gra jest w całości po stronie przeglądarki |

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
6. **Gra kończy się**, gdy głowa węża:
   - wyjdzie poza krawędź planszy (ściany są śmiertelne — brak przechodzenia na drugą stronę), **lub**
   - wejdzie na komórkę zajmowaną przez własne ciało.
7. Wynik końcowy = liczba zjedzonych owoców.

### Przypadki brzegowe

| Sytuacja | Oczekiwane zachowanie |
|---|---|
| Gracz wciska kierunek przeciwny do aktualnego (np. w lewo, gdy wąż idzie w prawo) | Ruch jest **ignorowany** — wąż nie może zawrócić w siebie |
| Gracz wciska dwa kierunki w czasie jednej klatki (np. w górę, potem w lewo) | Uwzględniany jest tylko pierwszy poprawny kierunek w danej klatce; drugi nie może obrócić węża o 180° |
| Wąż zajmuje całą planszę (400 komórek) | Gra kończy się ekranem wygranej — nie ma gdzie umieścić owocu |
| Wąż zjada owoc i w tym samym ruchu uderza w ścianę | Gra się kończy; punkt za owoc jest naliczony |
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
| Enter lub spacja | Na ekranie startowym: start gry na poziomie **Średnim**. Na ekranie końca gry: powrót do ekranu startowego |

Ruch węża sterowany jest wyłącznie klawiaturą. Wybór konkretnego poziomu trudności następuje myszką (kliknięcie przycisku); Enter/spacja to skrót omijający ten wybór.

---

## 6. Ekrany i interfejs

Gra ma trzy stany, przełączane w obrębie jednej strony (bez przeładowania):

### 6.1 Ekran startowy
- Tytuł gry
- Trzy przyciski poziomu trudności: **Łatwy / Średni / Trudny**
- Krótka informacja o sterowaniu (jedna linia)
- Kliknięcie poziomu rozpoczyna grę natychmiast

### 6.2 Rozgrywka
- Plansza 20 × 20
- Licznik punktów widoczny nad planszą
- Nazwa aktualnego poziomu trudności widoczna obok wyniku

### 6.3 Ekran końca gry
- Napis "Koniec gry" (lub "Wygrana!" przy wypełnieniu planszy)
- Osiągnięty wynik
- Przycisk **Zagraj ponownie** — wraca do ekranu startowego, gdzie można zmienić poziom trudności

---

## 7. Wygląd

Styl: **nowoczesny minimalizm**.

- Ciemne tło strony, plansza wyraźnie odcięta od tła
- Jeden kolor akcentu dla węża, kontrastowy kolor dla owocu
- Głowa węża wizualnie odróżniona od reszty ciała (jaśniejszy odcień lub obramowanie)
- Segmenty węża lekko zaokrąglone
- Czytelna typografia bezszeryfowa, wynik jako największy element tekstowy
- Brak obrazków i zewnętrznych czcionek — wszystko z CSS, żeby gra działała offline

---

## 8. Wymagania techniczne

### 8.1 Struktura plików

```
index.html    — struktura strony: nagłówek z wynikiem, kontener planszy, ekrany startowy i końcowy
style.css     — cały wygląd: siatka planszy, kolory, ekrany
game.js       — cała logika gry
```

Bez plików konfiguracyjnych, bez `package.json`, bez zależności zewnętrznych.

### 8.2 Renderowanie

Plansza to **siatka elementów HTML** (`<div>` w układzie CSS Grid), a nie `<canvas>`. Wybór podyktowany szkoleniem: stan gry widać bezpośrednio w inspektorze przeglądarki, a osoby znające HTML/CSS rozumieją rysowanie bez wprowadzania API Canvas.

- 400 komórek tworzonych jednorazowo przy starcie gry
- Przerysowanie polega na zmianie klas CSS istniejących komórek, a nie na kasowaniu i tworzeniu elementów od nowa

### 8.3 Organizacja kodu w `game.js`

Kod podzielony na wyraźnie oddzielone części, każda z jednym zadaniem:

1. **Stałe konfiguracyjne** — rozmiar planszy, prędkości poziomów trudności (zebrane na górze pliku, łatwe do zmiany na żywo podczas szkolenia)
2. **Stan gry** — pozycje segmentów węża, pozycja owocu, aktualny kierunek, wynik, aktualny ekran
3. **Pętla gry** — `setInterval` z odstępem zależnym od poziomu trudności; jedno wywołanie = jeden ruch węża
4. **Logika ruchu** — wyliczenie nowej pozycji głowy, wykrycie kolizji, wydłużenie lub skrócenie węża
5. **Obsługa klawiatury** — zamiana wciśniętego klawisza na kierunek, z blokadą zawracania
6. **Renderowanie** — przeniesienie stanu gry na klasy CSS komórek
7. **Przełączanie ekranów** — start, rozgrywka, koniec gry

Logika gry nie miesza się z renderowaniem: funkcje liczące ruch i kolizje nie dotykają DOM.

### 8.4 Środowisko

- Działa po otwarciu `index.html` z dysku (protokół `file://`) — bez serwera lokalnego
- Obsługiwane przeglądarki: aktualne wersje Chrome, Edge, Firefox
- Nowoczesny JavaScript (ES6+): `const`/`let`, funkcje strzałkowe. Moduły ES **nie** są używane, bo nie działają przez `file://`

---

## 9. Kryteria akceptacji

Gra jest gotowa, gdy wszystkie poniższe punkty są spełnione:

1. Otwarcie `index.html` dwuklikiem pokazuje ekran startowy z trzema poziomami trudności.
2. Kliknięcie poziomu uruchamia rozgrywkę, wąż rusza w prawo bez dodatkowej akcji gracza.
3. Strzałki i klawisze WASD zmieniają kierunek węża.
4. Próba zawrócenia o 180° nie kończy gry — ruch jest ignorowany.
5. Zjedzenie owocu wydłuża węża, zwiększa wynik o 1 i przenosi owoc w nowe losowe miejsce.
6. Owoc nigdy nie pojawia się na komórce zajętej przez węża.
7. Uderzenie w ścianę kończy grę i pokazuje ekran końcowy z wynikiem.
8. Uderzenie we własne ciało kończy grę i pokazuje ekran końcowy z wynikiem.
9. Przycisk "Zagraj ponownie" pozwala rozpocząć nową grę z wyborem poziomu, bez odświeżania strony.
10. Wąż na poziomie trudnym porusza się wyraźnie szybciej niż na łatwym.
11. Strzałki nie przewijają strony podczas gry.
12. W konsoli przeglądarki nie pojawiają się żadne błędy w trakcie pełnej rozgrywki.
