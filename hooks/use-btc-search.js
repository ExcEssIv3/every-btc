import React from 'react';
import { indexToPrivateKey, privateKeyToHex, decodeWIF, privateKeyHexToIndex, SECP256K1_ORDER } from '../lib/btcTools';
import { getCachedAddress } from './use-address-cache';
import { MAX_KEY } from '../lib/constants';

const WIF_REGEX = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/;
const HEX_ONLY_RE = /^[0-9a-f]+$/;
const HEX_CHARS = '0123456789abcdef';

const SEARCH_LOOKBACK = 50;
const SEARCH_LOOKAHEAD = 25;
const RANDOM_SEARCH_ITERATIONS = 200;
const ATTEMPTS_PER_POSITION = 5;

// For a hex pattern, construct candidate private keys with the pattern fixed at each
// possible position, randomizing the rest. Use the inverse Feistel to get the exact
// index — no random search needed.
function deterministicHexSearch(pattern, wantHigher, virtualPosition) {
  const patLen = pattern.length;
  if (patLen > 64) return null;
  const maxPos = 64 - patLen;

  let best = null;

  const tryCandidate = (hex) => {
    const privKey = BigInt('0x' + hex);
    if (privKey === 0n || privKey >= SECP256K1_ORDER) return;
    const index = privateKeyHexToIndex(hex);
    if (index < 0n || index > MAX_KEY) return;
    const satisfies = wantHigher ? index > virtualPosition : index < virtualPosition;
    if (!satisfies) return;
    const isBetter = best === null ? true : wantHigher ? index < best.index : index > best.index;
    if (isBetter) best = { index, hex, privKey };
  };

  for (let pos = 0; pos <= maxPos; pos++) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_POSITION; attempt++) {
      let hex = '';
      for (let i = 0; i < 64; i++) {
        hex += (i >= pos && i < pos + patLen)
          ? pattern[i - pos]
          : HEX_CHARS[Math.floor(Math.random() * 16)];
      }
      tryCandidate(hex);
    }
  }

  if (best) {
    const address = getCachedAddress(best.hex, best.privKey);
    return { index: best.index, hex: best.hex, address };
  }

  // Fallback: return any match ignoring direction
  for (let pos = 0; pos <= maxPos; pos++) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_POSITION; attempt++) {
      let hex = '';
      for (let i = 0; i < 64; i++) {
        hex += (i >= pos && i < pos + patLen)
          ? pattern[i - pos]
          : HEX_CHARS[Math.floor(Math.random() * 16)];
      }
      const privKey = BigInt('0x' + hex);
      if (privKey === 0n || privKey >= SECP256K1_ORDER) continue;
      const index = privateKeyHexToIndex(hex);
      if (index < 0n || index > MAX_KEY) continue;
      const address = getCachedAddress(hex, privKey);
      return { index, hex, address };
    }
  }

  return null;
}

function randomBigIntBelow(max) {
  const bits = max.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let n = 0n;
  for (const b of arr) {
    n = n * 256n + BigInt(b);
  }
  return n % max;
}

function keyAtIndex(index) {
  const privKey = indexToPrivateKey(index);
  const hex = privateKeyToHex(privKey);
  const address = getCachedAddress(hex, privKey);
  return { index, hex, address };
}

export function useBtcSearch({ virtualPosition, displayedKeys }) {
  const [search, setSearch] = React.useState(null);
  const [currentKey, setCurrentKey] = React.useState(null);
  const [nextStates, setNextStates] = React.useState([]);

  const searchAround = React.useCallback(
    ({ input, wantHigher, canUseCurrentIndex }) => {
      if (wantHigher) {
        const startI = canUseCurrentIndex ? 0 : 1;
        for (let i = startI; i < displayedKeys.length; i++) {
          const { hex, address, index } = displayedKeys[i];
          if (hex && address && (hex.includes(input) || address.includes(input))) {
            return { hex, address, index };
          }
        }
        // Lookahead beyond displayed
        for (let i = 1; i <= SEARCH_LOOKAHEAD; i++) {
          const index = virtualPosition + BigInt(displayedKeys.length) + BigInt(i);
          if (index > MAX_KEY) continue;
          const k = keyAtIndex(index);
          if (k.hex.includes(input) || k.address.includes(input)) {
            return k;
          }
        }
      } else {
        for (let i = 1; i <= SEARCH_LOOKBACK; i++) {
          const index = virtualPosition - BigInt(i);
          if (index < 0n) continue;
          const k = keyAtIndex(index);
          if (k.hex.includes(input) || k.address.includes(input)) {
            return k;
          }
        }
      }
      return null;
    },
    [displayedKeys, virtualPosition]
  );

  const searchRandomly = React.useCallback(
    ({ input, wantHigher }) => {
      if (HEX_ONLY_RE.test(input)) {
        return deterministicHexSearch(input, wantHigher, virtualPosition);
      }

      // Address substring: no algebraic shortcut exists, use random search
      let best = null;
      for (let i = 0; i < RANDOM_SEARCH_ITERATIONS; i++) {
        const index = randomBigIntBelow(MAX_KEY) + 1n;
        const privKey = indexToPrivateKey(index);
        const hex = privateKeyToHex(privKey);
        const address = getCachedAddress(hex, privKey);
        if (!hex.includes(input) && !address.includes(input)) continue;
        const satisfies = wantHigher ? index > virtualPosition : index < virtualPosition;
        if (satisfies) {
          const isBetter = best === null ? true : wantHigher ? index < best.index : index > best.index;
          if (isBetter) best = { index, hex, address };
        }
      }
      if (best) return best;
      for (let i = 0; i < RANDOM_SEARCH_ITERATIONS; i++) {
        const index = randomBigIntBelow(MAX_KEY) + 1n;
        const privKey = indexToPrivateKey(index);
        const hex = privateKeyToHex(privKey);
        const address = getCachedAddress(hex, privKey);
        if (hex.includes(input) || address.includes(input)) return { index, hex, address };
      }
      return null;
    },
    [virtualPosition]
  );

  const searchKey = React.useCallback(
    (input) => {
      if (!input) return null;

      // WIF decode: jump directly to the exact key
      if (WIF_REGEX.test(input.trim())) {
        const hex = decodeWIF(input.trim());
        if (hex) {
          const index = privateKeyHexToIndex(hex);
          if (index >= 0n && index <= MAX_KEY) {
            const privKey = BigInt('0x' + hex);
            const address = getCachedAddress(hex, privKey);
            const result = { index, hex, address };
            setSearch(hex);
            setCurrentKey(result);
            setNextStates([result]);
            return hex;
          }
        }
      }

      const cleaned = input.toLowerCase();
      setNextStates([]);

      const around = searchAround({ input: cleaned, wantHigher: true, canUseCurrentIndex: true });
      const result = around ?? searchRandomly({ input: cleaned, wantHigher: true });

      if (result) {
        setSearch(cleaned);
        setCurrentKey(result);
        setNextStates([result]);
      }
      return result?.hex ?? null;
    },
    [searchAround, searchRandomly]
  );

  const nextKey = React.useCallback(() => {
    if (!currentKey || !search) return null;
    const around = searchAround({ input: search, wantHigher: true, canUseCurrentIndex: false });
    const result = around ?? searchRandomly({ input: search, wantHigher: true });
    if (result) {
      setCurrentKey(result);
      setNextStates((prev) => [...prev, result]);
      return result.hex;
    }
    return null;
  }, [currentKey, search, searchAround, searchRandomly]);

  const previousKey = React.useCallback(() => {
    if (!currentKey || !search) return null;
    if (nextStates.length > 1) {
      const prevState = nextStates[nextStates.length - 2];
      setNextStates((prev) => prev.slice(0, -1));
      setCurrentKey(prevState);
      return prevState.hex;
    }
    const around = searchAround({ input: search, wantHigher: false, canUseCurrentIndex: false });
    const result = around ?? searchRandomly({ input: search, wantHigher: false });
    if (result) {
      setCurrentKey(result);
      return result.hex;
    }
    return null;
  }, [currentKey, search, nextStates, searchAround, searchRandomly]);

  return { searchKey, nextKey, previousKey, currentKey };
}
