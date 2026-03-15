# Every UUID

A web app that displays every possible UUID v4 — searchable, scrollable, and saveable. The full list (2^122 items) is never stored; UUIDs are generated on demand via a deterministic algorithm.

**Live at**: https://everyuuid.com

## Tech Stack

- **React 18** + **styled-components 6**
- **Parcel 2** (bundler)
- **node-forge** (easter egg crypto only)
- **JavaScript** (ES6+, BigInt throughout)

## Commands

```bash
npm run dev       # Start dev server (Parcel, localhost:1234)
npm run build     # Production build → dist/
npm run new-component  # Scaffold a new component
```

Both `dev` and `build` auto-run a `pre*` script that cleans `.parcel-cache` and `dist/` first.

## Project Structure

```
lib/
  uuidTools.js     # Core math: indexToUUID(), uuidToIndex()
  constants.js     # MAX_UUID (2^122), layout constants

src/
  components/
    App/           # Root state, favorites, animation, easter egg trigger
    UUIDDisplay/   # Virtual scroll list, keyboard/touch/mouse input
    SearchWidget/  # CMD+F search UI
    Scrollbar/     # Custom draggable scrollbar
    FavoritesWidget/
    Header/
    JokeOverlay/   # #theo easter egg
    Icons/
  global-styles.css

hooks/
  use-uuid-search.js  # Search logic hook

public/
  index.html       # HTML entry point
```

## Core Algorithm

`indexToUUID(index)` in `lib/uuidTools.js` maps any BigInt index (0 → 2^122 − 1) to a unique, valid UUID v4 using a **4-round Feistel network cipher**:

1. Split 122-bit index into two 61-bit halves (left, right)
2. Apply 4 Feistel rounds (XOR, rotation, multiplication with constants)
3. Pack the scrambled bits into UUID format:
   - Version nibble fixed to `4`
   - Variant bits fixed to `0b10` (RFC 4122)
4. Return formatted UUID string

`uuidToIndex(uuid)` reverses this — strips the fixed bits, reverses the Feistel rounds, reconstructs the original index. This means any UUID can be located instantly without a lookup table.

## Key State (App.js)

| State | Type | Purpose |
|-------|------|---------|
| `virtualPosition` | BigInt | Current scroll offset into the 2^122 list |
| `favedUUIDs` | `{ [uuid]: true }` | Favorites, persisted to `localStorage` |
| `search` | string | Active search query |
| `isAnimating` / `targetPosition` | bool / BigInt | Animation control |
| `showFavorites` | bool | Favorites view toggle |

## Search

- **Fast path**: checks currently displayed UUIDs for substring match
- **Fallback**: generates 100 random UUIDs matching the pattern, picks closest to current position
- UUID v4 constraints enforced: position 14 must be `4`, position 19 must be `[89ab]`
- History stack for back-navigation (`nextStates`)
- Keyboard: `CMD/Ctrl+F` open/close, `Enter` next, `Shift+Enter` previous

## Favorites

Stored as `localStorage.favedUUIDs` (JSON object `{ uuid: true }`). Favorites view shows saved UUIDs sorted by their index order, using the same virtual scroll list.

## Virtual Scrolling

`UUIDDisplay` only renders ~20–40 DOM rows at a time regardless of scroll position. UUIDs are computed on demand via `indexToUUID(virtualPosition + offset)`. BigInt is used throughout to avoid floating-point precision loss at large indices.

## Easter Egg

Visiting `/#theo` opens `JokeOverlay`, which tries AES-256-CBC decryption of a hidden message using each visible UUID as a password. Related to a joke referenced in early commits.

## Notable Details

- Vim keys (`j`/`k`), arrow keys, Page Up/Down, Home/End all work in the list
- Touch momentum scrolling supported on mobile
- Rows are 24px tall on desktop, 48px on mobile (<768px)
- Clicking a UUID row copies it to clipboard
