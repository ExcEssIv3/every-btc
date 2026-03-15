# Every Bitcoin Private Key

Every possible Bitcoin private key, its address, and balance — searchable and scrollable.

## Features

- Scrolls through all ~2^256 possible Bitcoin private keys
- Derives P2PKH (`1...`) and P2WPKH (`bc1q...`) addresses — toggle between them in the header
- Auto-fetches BTC balances for visible rows via [blockstream.info](https://blockstream.info)
- Search by hex substring, address substring, or paste a WIF-encoded private key to jump directly to it
- Star/favorite keys, persisted in localStorage

## Tech Stack

- **React 18** + **styled-components 6**
- **Parcel 2** (bundler)
- **@noble/secp256k1** + **@noble/hashes** (key derivation)
- **JavaScript** (ES6+, BigInt throughout)

## How it works

Keys are generated on demand via an **8-round 256-bit Feistel cipher** that maps any index to a unique private key in `[1, ORDER-1]`. No keys are stored — the full list is computed as you scroll. The cipher is invertible, so pasting a WIF key resolves to its exact position instantly.

## Commands

```bash
npm run dev     # Start dev server (localhost:1234)
npm run build   # Production build → dist/
```
