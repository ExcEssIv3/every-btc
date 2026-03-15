import React from 'react';
import { indexToPrivateKey, privateKeyToHex, decodeWIF, privateKeyHexToIndex } from '../lib/btcTools';
import { getCachedAddress } from './use-address-cache';
import { MAX_KEY } from '../lib/constants';

const WIF_REGEX = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/;

const SEARCH_LOOKBACK = 50;
const SEARCH_LOOKAHEAD = 25;
const RANDOM_SEARCH_ITERATIONS = 200;

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
      let best = null;
      for (let i = 0; i < RANDOM_SEARCH_ITERATIONS; i++) {
        const index = randomBigIntBelow(MAX_KEY) + 1n;
        const k = keyAtIndex(index);
        if (!k.hex.includes(input) && !k.address.includes(input)) continue;
        const satisfies = wantHigher ? index > virtualPosition : index < virtualPosition;
        if (satisfies) {
          const isBetter =
            best === null
              ? true
              : wantHigher
                ? index < best.index
                : index > best.index;
          if (isBetter) best = k;
        }
      }
      if (best) return best;
      // Fallback: return any match ignoring direction
      for (let i = 0; i < RANDOM_SEARCH_ITERATIONS; i++) {
        const index = randomBigIntBelow(MAX_KEY) + 1n;
        const k = keyAtIndex(index);
        if (k.hex.includes(input) || k.address.includes(input)) return k;
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
