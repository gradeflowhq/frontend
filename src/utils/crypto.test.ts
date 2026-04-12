import { describe, expect, it } from 'vitest';

import { decryptString, encryptString, isEncrypted, startCryptoSession } from '@utils/crypto';

describe('isEncrypted', () => {
  it('returns true for enc:v1: prefixed strings', () => {
    expect(isEncrypted('enc:v1:salt:iv:cipher')).toBe(true);
  });

  it('returns false for plain strings', () => {
    expect(isEncrypted('hello world')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isEncrypted(123)).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });
});

describe('encrypt / decrypt round-trip', () => {
  const passphrase = 'test-passphrase-123';

  it('encrypts and decrypts back to original', async () => {
    await startCryptoSession(passphrase);
    const encrypted = await encryptString('secret data', passphrase);
    expect(isEncrypted(encrypted)).toBe(true);
    const decrypted = await decryptString(encrypted, passphrase);
    expect(decrypted).toBe('secret data');
  });

  it('handles empty string', async () => {
    await startCryptoSession(passphrase);
    const encrypted = await encryptString('', passphrase);
    const decrypted = await decryptString(encrypted, passphrase);
    expect(decrypted).toBe('');
  });

  it('handles unicode text', async () => {
    await startCryptoSession(passphrase);
    const text = 'こんにちは 🌍 café';
    const encrypted = await encryptString(text, passphrase);
    const decrypted = await decryptString(encrypted, passphrase);
    expect(decrypted).toBe(text);
  });
});

describe('decryptString', () => {
  it('passes through non-encrypted strings', async () => {
    expect(await decryptString('plain text', 'any')).toBe('plain text');
  });

  it('throws on invalid encrypted format', async () => {
    await expect(decryptString('enc:v1:only_two_parts', 'pass')).rejects.toThrow(
      'Invalid encrypted format'
    );
  });
});
