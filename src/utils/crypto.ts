// Session-based KDF + AES-GCM encryption/decryption utilities.
// Envelope: enc:v1:<session_salt_b64>:<iv_b64>:<cipher_b64>

type DeriveOptions = {
  iterations?: number; // default 100_000; session-based => derive once per salt
  hash?: 'SHA-256' | 'SHA-1'; // default 'SHA-256'
  length?: 128 | 192 | 256; // default 256
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (str: string) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer;

export const isEncrypted = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('enc:v1:');

// ---------- KDF (PBKDF2) ----------

const deriveKeyPBKDF2 = async (
  passphrase: string,
  salt: ArrayBuffer,
  opts: DeriveOptions = {}
): Promise<CryptoKey> => {
  const {
    iterations = 100_000,
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

// ---------- session-based helpers ----------

// Cache: session_salt_b64 -> CryptoKey (derived once per session salt)
const sessionKeyCache = new Map<string, CryptoKey>();

// Currently active session salt (base64) to reuse for new encryptions in this page session
let currentSessionSaltB64: string | null = null;

// Pre-initialize or override the current crypto session.
// If saltB64 is not provided, a random salt is generated.
// Returns the saltB64 used for this session.
export const startCryptoSession = async (passphrase: string, saltB64?: string): Promise<string> => {
  const effectiveSaltB64 = saltB64 ?? toB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
  if (!sessionKeyCache.has(effectiveSaltB64)) {
    const key = await deriveKeyPBKDF2(passphrase, fromB64(effectiveSaltB64));
    sessionKeyCache.set(effectiveSaltB64, key);
  }
  currentSessionSaltB64 = effectiveSaltB64;
  return effectiveSaltB64;
};

// Ensure we have a CryptoKey cached for a given salt
const getKeyForSessionSalt = async (passphrase: string, saltB64: string): Promise<CryptoKey> => {
  const cached = sessionKeyCache.get(saltB64);
  if (cached) return cached;
  const key = await deriveKeyPBKDF2(passphrase, fromB64(saltB64));
  sessionKeyCache.set(saltB64, key);
  return key;
};

// Encrypt a UTF-8 string using the current session.
// Uses or creates currentSessionSaltB64 lazily.
export const encryptString = async (
  plainText: string,
  passphrase: string
): Promise<string> => {
  const saltB64 =
    currentSessionSaltB64 ??
    (await startCryptoSession(passphrase)); // derives & sets currentSessionSaltB64

  const key = await getKeyForSessionSalt(passphrase, saltB64);

  const iv = crypto.getRandomValues(new Uint8Array(12)).buffer;
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plainText));
  return `enc:v1:${saltB64}:${toB64(iv)}:${toB64(cipher)}`;
};

// Decrypt a UTF-8 string.
export const decryptString = async (
  encoded: string,
  passphrase: string
): Promise<string> => {
  if (!isEncrypted(encoded)) {
    return encoded; // passthrough for plaintext
  }

  // enc:v1:<session_salt_b64>:<iv_b64>:<cipher_b64>
  const parts = encoded.split(':');
  if (parts.length !== 5) throw new Error('Invalid encrypted format');
  const [, , saltB64, ivB64, cipherB64] = parts;

  const key = await getKeyForSessionSalt(passphrase, saltB64);
  currentSessionSaltB64 = saltB64; // mark as current for subsequent encrypts

  const iv = fromB64(ivB64);
  const cipher = fromB64(cipherB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return textDecoder.decode(plain);
};