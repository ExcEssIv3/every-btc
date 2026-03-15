import { getPublicKey } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';

// 8-round 128+128 Feistel cipher over 256-bit space
const MASK_128 = (1n << 128n) - 1n;

const ROUND_CONSTANTS = [
  0x6c62272e07bb014262b821756295c58dn,
  0x9e3779b97f4a7c15f39cc0605cedc834n,
  0xd2a98b26625eee7b7eb03c78d2d3d759n,
  0xa4093822299f31d008b8a5c6d4e3c7b2n,
  0x3c6ef372fe94f82b9b8a4e7cd56f8a31n,
  0xbb67ae8584caa73b2bf7b4e2b8a1c6d3n,
  0x510e527fade682d19b05688c2b3e6c1fn,
  0x9b05688c2b3e6c1f1f83d9abfb41bd6bn,
];

function feistelRound(x, round) {
  x ^= ROUND_CONSTANTS[round] & MASK_128;
  x = ((x << 13n) | (x >> 115n)) & MASK_128;
  x = (x * 0x6c62272e07bb014262b821756295c58dn) & MASK_128;
  x = ((x << 31n) | (x >> 97n)) & MASK_128;
  return x;
}

function feistelPermute(index) {
  let left = index >> 128n;
  let right = index & MASK_128;
  for (let r = 0; r < 8; r++) {
    [left, right] = [right, (left ^ feistelRound(right, r)) & MASK_128];
  }
  return (left << 128n) | right;
}

export const SECP256K1_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

// Maps index [0, ORDER-1) to a unique private key in [1, ORDER-1]
// Cycle-walks when result is 0 or >= ORDER (negligible probability)
export function indexToPrivateKey(index) {
  let candidate = feistelPermute(index);
  while (candidate === 0n || candidate >= SECP256K1_ORDER) {
    candidate = feistelPermute(candidate);
  }
  return candidate;
}

// Inverse Feistel: recovers the original index from a private key BigInt.
// Assumes no cycle-walking occurred (probability ~2^-128, negligible).
function feistelInversePermute(value) {
  let left = value >> 128n;
  let right = value & MASK_128;
  for (let r = 7; r >= 0; r--) {
    [left, right] = [(right ^ feistelRound(left, r)) & MASK_128, left];
  }
  return (left << 128n) | right;
}

// Converts a 64-char hex private key back to its list index.
export function privateKeyHexToIndex(hex) {
  const privKey = BigInt('0x' + hex);
  return feistelInversePermute(privKey);
}

export function privateKeyToHex(privKey) {
  return privKey.toString(16).padStart(64, '0');
}

function bigIntToBytes32(n) {
  const hex = n.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes) {
  let num = 0n;
  for (const b of bytes) {
    num = num * 256n + BigInt(b);
  }
  let result = '';
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % 58n)] + result;
    num = num / 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    result = '1' + result;
  }
  return result;
}

function base58Decode(str) {
  let num = 0n;
  for (const char of str) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit < 0) throw new Error(`Invalid Base58 character: ${char}`);
    num = num * 58n + BigInt(digit);
  }
  const bytes = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }
  for (const char of str) {
    if (char !== '1') break;
    bytes.unshift(0);
  }
  return new Uint8Array(bytes);
}

// Decodes a WIF private key string to a 64-char hex string.
// Returns null if the input is not valid WIF.
export function decodeWIF(wif) {
  try {
    const bytes = base58Decode(wif);
    // bytes: [0x80, ...32 privkey bytes, (optional 0x01 compression flag), ...4 checksum bytes]
    if (bytes[0] !== 0x80) return null;
    const isCompressed = bytes.length === 38; // 1 + 32 + 1 + 4
    const isUncompressed = bytes.length === 37; // 1 + 32 + 4
    if (!isCompressed && !isUncompressed) return null;
    const privBytes = bytes.slice(1, 33);
    let hex = '';
    for (const b of privBytes) hex += b.toString(16).padStart(2, '0');
    return hex;
  } catch {
    return null;
  }
}

// Derives a P2PKH (legacy) Bitcoin address (starts with "1") from a private key BigInt
export function privateKeyToAddress(privKeyBigInt) {
  const privBytes = bigIntToBytes32(privKeyBigInt);
  const pubKey = getPublicKey(privBytes, true); // compressed, 33 bytes
  const hash160 = ripemd160(sha256(pubKey));
  const versioned = new Uint8Array(21);
  versioned[0] = 0x00; // mainnet P2PKH
  versioned.set(hash160, 1);
  const checksum = sha256(sha256(versioned)).slice(0, 4);
  const payload = new Uint8Array(25);
  payload.set(versioned);
  payload.set(checksum, 21);
  return base58Encode(payload);
}

// Bech32 encoding for P2WPKH (native segwit, starts with "bc1q")
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values) {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) chk ^= (b >> i) & 1 ? BECH32_GEN[i] : 0;
  }
  return chk;
}

function bech32HrpExpand(hrp) {
  const ret = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function bech32Checksum(hrp, data) {
  const values = [...bech32HrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const polymod = bech32Polymod(values) ^ 1;
  return Array.from({ length: 6 }, (_, i) => (polymod >> (5 * (5 - i))) & 31);
}

function convertBits(data, from, to) {
  let acc = 0, bits = 0;
  const ret = [];
  const maxv = (1 << to) - 1;
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) { bits -= to; ret.push((acc >> bits) & maxv); }
  }
  if (bits > 0) ret.push((acc << (to - bits)) & maxv);
  return ret;
}

// Derives a P2WPKH (native segwit) Bitcoin address (starts with "bc1q") from a private key BigInt
export function privateKeyToP2WPKHAddress(privKeyBigInt) {
  const privBytes = bigIntToBytes32(privKeyBigInt);
  const pubKey = getPublicKey(privBytes, true);
  const hash160 = ripemd160(sha256(pubKey));
  const hrp = 'bc';
  const data = [0, ...convertBits(hash160, 8, 5)];
  const checksum = bech32Checksum(hrp, data);
  return hrp + '1' + [...data, ...checksum].map(d => BECH32_CHARSET[d]).join('');
}
