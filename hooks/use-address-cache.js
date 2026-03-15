import { privateKeyToAddress, privateKeyToP2WPKHAddress } from '../lib/btcTools';

const MAX_CACHE_SIZE = 500;
const cache = new Map(); // `${hex}:${type}` → address

export function getCachedAddress(hex, privKeyBigInt, addressType = 'p2pkh') {
  const key = `${hex}:${addressType}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const address = addressType === 'p2wpkh'
    ? privateKeyToP2WPKHAddress(privKeyBigInt)
    : privateKeyToAddress(privKeyBigInt);
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, address);
  return address;
}
