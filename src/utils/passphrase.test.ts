import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildPassphraseKey,
  clearPassphrase,
  normalizePresent,
  readPassphrase,
  writePassphrase,
} from '@utils/passphrase';

describe('buildPassphraseKey', () => {
  it('returns namespaced key', () => {
    expect(buildPassphraseKey('abc-123')).toBe('submissions_passphrase:abc-123');
  });
});

describe('normalizePresent', () => {
  it('returns null for null', () => {
    expect(normalizePresent(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizePresent('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(normalizePresent('   ')).toBeNull();
  });

  it('preserves non-empty string exactly', () => {
    expect(normalizePresent(' hello ')).toBe(' hello ');
  });
});

describe('localStorage operations', () => {
  const key = 'test_key';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('writePassphrase stores and readPassphrase retrieves', () => {
    writePassphrase(key, 'secret');
    expect(readPassphrase(key)).toBe('secret');
  });

  it('readPassphrase returns null when key absent', () => {
    expect(readPassphrase(key)).toBeNull();
  });

  it('readPassphrase returns null for empty stored value', () => {
    localStorage.setItem(key, '');
    expect(readPassphrase(key)).toBeNull();
  });

  it('clearPassphrase removes the key', () => {
    writePassphrase(key, 'secret');
    clearPassphrase(key);
    expect(readPassphrase(key)).toBeNull();
  });
});
