# Prompt — ilustracja ekranu startowego gry "Wężoidy"

**Przeznaczenie:** ilustracja nad tytułem na ekranie startowym (punkt 6.1 wymagań)
**Styl:** płaski minimalizm, paleta gry z `style.css`
**Proporcje:** 5:3 (jak obecne SVG w `index.html`, 200 × 120)

---

## Prompt

```
Flat minimalist vector illustration for the start screen of a browser Snake game, 5:3 aspect ratio, modern clean UI style. Subject: a friendly stylized snake gliding in a smooth S-curve from left to right toward a single apple. Snake: thick, uniform tube-like body in mint green (#3ddc97) with fully rounded ends, the body tapering slightly toward the tail; head as a lighter mint circle (#9af5c9) with a thin mint outline, two simple white dot eyes with small dark pupils looking toward the apple. Apple: simple flat coral-pink shape (#ff5e7a) with one small mint-green leaf, a short brown stem and a subtle soft white highlight. Composition: subject centered horizontally, generous empty space around it, nothing touching the edges. Background: solid flat very dark charcoal (#0f1115), completely uniform, no gradient, no texture, no vignette. Style: geometric shapes, smooth curves, no outlines except the head, no shading or at most one soft flat shadow tone, no 3D, no realism, no gloss. Palette strictly limited to mint green, light mint, coral pink, white and dark charcoal. No text, no letters, no logos, no grid, no game board, no UI elements, no additional objects. Crisp edges, high resolution, suitable for display at small size.
```

### Wariant z przezroczystym tłem

Jeśli generator obsługuje kanał alfa, zamień zdanie `Background: ...` na:

```
Background: fully transparent (PNG with alpha channel).
```

---

## Paleta (zgodna z `style.css`)

| Element | Kolor | Zmienna CSS |
|---|---|---|
| Ciało węża, listek | `#3ddc97` | `--accent` |
| Głowa węża | `#9af5c9` | `--accent-light` |
| Jabłko | `#ff5e7a` | `--fruit` |
| Tło | `#0f1115` | `--bg` |

## Uwagi

- Kolory HEX generatory traktują orientacyjnie, ale trzymają paletę lepiej niż przy samych nazwach kolorów.
- Tło musi być jednolite — każdy gradient lub faktura będzie widoczna jako prostokąt na ciemnej stronie.
- **Zgodność z wymaganiami:** punkty 7 i 8.1 mówią o grafice wyłącznie jako SVG wbudowanym w kod, bez plików graficznych. Wygenerowany obraz można:
  1. potraktować jako wzór i przerysować go na SVG w `index.html` — wymagania bez zmian, albo
  2. dodać jako plik w folderze `img/` — działa offline, ale wymaga zmiany punktów 7 i 8.1.
