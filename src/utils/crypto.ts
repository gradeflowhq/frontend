// General-purpose crypto utilities using Web Crypto API (AES-GCM with PBKDF2).
// Envelope format: enc:v1:<salt_b64>:<iv_b64>:<cipher_b64>

type DeriveOptions = {
  iterations?: number; // default 150_000
  hash?: 'SHA-256' | 'SHA-1'; // default 'SHA-256'
  length?: 128 | 192 | 256; // default 256
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (str: string) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer;

const deriveKey = async (
  passphrase: string,
  salt: ArrayBuffer,
  opts: DeriveOptions = {}
): Promise<CryptoKey> => {
  const {
    iterations = 150_000,
    hash = 'SHA-256',
    length = 256,
  } = opts;
  const keyMat = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash },
    keyMat,
    { name: 'AES-GCM', length },
    false,
    ['encrypt', 'decrypt']
  );
};

export const isEncrypted = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('enc:v1:');

// Encrypt a UTF-8 string
export const encryptString = async (
  plainText: string,
  passphrase: string,
  opts?: DeriveOptions
): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
  const iv = crypto.getRandomValues(new Uint8Array(12)).buffer;
  const key = await deriveKey(passphrase, salt, opts);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plainText));
  return `enc:v1:${toB64(salt)}:${toB64(iv)}:${toB64(cipher)}`;
};

// Decrypt a UTF-8 string (returns original plaintext)
export const decryptString = async (
  encoded: string,
  passphrase: string,
  opts?: DeriveOptions
): Promise<string> => {
  if (!isEncrypted(encoded)) return encoded;
  const parts = encoded.split(':');
  if (parts.length !== 5) throw new Error('Invalid encrypted format');
  const [, , saltB64, ivB64, cipherB64] = parts;
  const salt = fromB64(saltB64);
  const iv = fromB64(ivB64);
  const cipher = fromB64(cipherB64);
  const key = await deriveKey(passphrase, salt, opts);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return textDecoder.decode(plain);
};