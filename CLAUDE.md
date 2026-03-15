# Every Bitcoin Private Key

A web app that displays every possible Bitcoin private key, its address, and balance — searchable, scrollable, and saveable. Keys are never stored; they are generated on demand via a deterministic Feistel cipher.

## Tech Stack

- **React 18** + **styled-components 6**
- **Parcel 2** (bundler)
- **@noble/secp256k1** + **@noble/hashes** (secp256k1 point multiplication, SHA-256, RIPEMD-160)
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
  btcTools.js    # Core math: Feistel cipher, key derivation, address encoding, WIF decode
  constants.js   # MAX_KEY (secp256k1 order - 1), layout constants

src/
  components/
    App/           # Root state, favorites, animation
    KeyDisplay/    # Virtual scroll list, keyboard/touch/mouse input
    SearchWidget/  # CMD+F search UI
    Scrollbar/     # Custom draggable scrollbar
    FavoritesWidget/
    Header/        # Address type toggle (P2PKH / P2WPKH)
    Icons/
  global-styles.css

hooks/
  use-btc-search.js     # Search logic: WIF decode, hex/address substring, inverse Feistel
  use-address-cache.js  # LRU cache for address derivation (keyed by hex:type)
  use-balance.js        # Auto-fetch balances from blockstream.info

public/
  index.html       # HTML entry point
```

## Core Algorithm

`indexToPrivateKey(index)` in `lib/btcTools.js` maps any BigInt index to a unique private key in `[1, ORDER-1]` using an **8-round 256-bit Feistel cipher**:

1. Split 256-bit index into two 128-bit halves (left, right)
2. Apply 8 Feistel rounds (XOR, rotation, multiplication with constants)
3. Cycle-walk if result is `0` or `>= ORDER` (probability ~2^-128, negligible)
4. Return private key BigInt

The cipher is invertible — `privateKeyHexToIndex(hex)` reverses the Feistel to find the exact list position for any key. This powers WIF search.

## Key State (App.js)

| State | Type | Purpose |
|-------|------|---------|
| `virtualPosition` | BigInt | Current scroll offset into the key list |
| `favedKeys` | `{ [hex]: { index, address } }` | Favorites, persisted to `localStorage` |
| `addressType` | `'p2pkh' \| 'p2wpkh'` | Active address format |
| `search` | string | Active search query |
| `isAnimating` / `targetPosition` | bool / BigInt | Animation control |
| `showFavorites` | bool | Favorites view toggle |

## Address Derivation

Both address types are derived from the compressed public key via HASH160 (SHA-256 → RIPEMD-160):

- **P2PKH** (`1...`) — Base58Check with version byte `0x00`
- **P2WPKH** (`bc1q...`) — Bech32 with witness version `0`

Results are cached in a module-level LRU Map keyed by `${hex}:${type}` (max 500 entries).

## Search

- **WIF key**: decoded to hex → inverse Feistel → jumps directly to exact row
- **Hex substring**: scans visible rows, lookahead/lookback, then random fallback
- **Address substring**: scans visible rows, then random fallback
- History stack for back-navigation (`nextStates`)
- Keyboard: `CMD/Ctrl+F` open/close, `Enter` next, `Shift+Enter` previous

## Balance Fetching

`use-balance.js` auto-fetches balances for all visible rows after a 400ms scroll-stop debounce. All visible addresses are fetched in parallel via `Promise.all` against `https://blockstream.info/api/address/{address}`. Results are cached in a module-level Map — cache hits render instantly with no request.

## Favorites

Stored as `localStorage.favedKeys` (JSON object `{ [hex]: { index: string, address: string } }`). Favorites view shows saved keys sorted by index, using the same virtual scroll list.

## Virtual Scrolling

`KeyDisplay` only renders ~32 DOM rows at a time regardless of scroll position. Keys are computed on demand via `indexToPrivateKey(virtualPosition + offset)`. BigInt is used throughout to avoid floating-point precision loss at large indices.

## Notable Details

- Vim keys (`j`/`k`), arrow keys, Page Up/Down, Home/End all work in the list
- Touch momentum scrolling supported on mobile
- Rows are 24px tall
- Copy button copies the raw 64-char hex private key to clipboard
