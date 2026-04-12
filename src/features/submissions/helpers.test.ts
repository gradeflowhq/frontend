import { describe, expect, it } from 'vitest';

import { buildSourceCsv, extractQuestionKeys, tryDecodeExportCsv } from '@features/submissions/helpers';
import { startCryptoSession } from '@utils/crypto';

import type { RawSubmission } from '@features/submissions/types';

const makeSub = (answerMap: Record<string, unknown>): RawSubmission =>
  ({
    raw_answer_map: answerMap,
  } as RawSubmission);

describe('extractQuestionKeys', () => {
  it('returns empty array for empty input', () => {
    expect(extractQuestionKeys([])).toEqual([]);
  });

  it('returns sorted unique keys from a single submission', () => {
    const sub = makeSub({ q2: 'b', q10: 'a', q1: 'c' });
    expect(extractQuestionKeys([sub])).toEqual(['q1', 'q2', 'q10']);
  });

  it('merges keys across multiple submissions', () => {
    const subs = [makeSub({ q1: 'a' }), makeSub({ q2: 'b' })];
    expect(extractQuestionKeys(subs)).toEqual(['q1', 'q2']);
  });

  it('deduplicates keys that appear in multiple submissions', () => {
    const subs = [makeSub({ q1: 'a', q2: 'b' }), makeSub({ q1: 'c', q3: 'd' })];
    const result = extractQuestionKeys(subs);
    expect(result).toEqual(['q1', 'q2', 'q3']);
  });

  it('handles submissions with null/undefined raw_answer_map', () => {
    const sub = { raw_answer_map: null } as unknown as RawSubmission;
    expect(extractQuestionKeys([sub])).toEqual([]);
  });
});

describe('buildSourceCsv', () => {
  const preview = {
    headers: ['id', 'Q1', 'Q2'],
    rows: [
      ['alice', 'A', 'B'],
      ['bob', 'C', 'D'],
    ],
  };

  it('builds CSV without encryption', async () => {
    const { csv, encrypted } = await buildSourceCsv(preview, 'id');
    expect(encrypted).toBe(false);
    expect(csv).toContain('id,Q1,Q2');
    expect(csv).toContain('alice,A,B');
    expect(csv).toContain('bob,C,D');
  });

  it('throws when student ID column not found', async () => {
    await expect(buildSourceCsv(preview, 'missing')).rejects.toThrow(
      'Student ID column "missing" not found'
    );
  });

  it('encrypts student IDs when passphrase provided', async () => {
    const passphrase = 'test-pass-build';
    await startCryptoSession(passphrase);
    const { csv, encrypted } = await buildSourceCsv(preview, 'id', {
      passphrase,
    });
    expect(encrypted).toBe(true);
    // Student IDs should be encrypted
    expect(csv).not.toContain('alice');
    expect(csv).not.toContain('bob');
    // Non-ID columns should be preserved
    expect(csv).toContain(',A,B');
    expect(csv).toContain(',C,D');
  });

  it('skips encryption when passphrase is empty', async () => {
    const { encrypted } = await buildSourceCsv(preview, 'id', {
      passphrase: '   ',
    });
    expect(encrypted).toBe(false);
  });
});

describe('tryDecodeExportCsv', () => {
  it('returns original CSV when no passphrase', async () => {
    const csv = 'student_id,score\nalice,10';
    expect(await tryDecodeExportCsv(csv)).toBe(csv);
  });

  it('returns original CSV when passphrase is empty', async () => {
    const csv = 'student_id,score\nalice,10';
    expect(await tryDecodeExportCsv(csv, { passphrase: '' })).toBe(csv);
  });

  it('returns original CSV when student_id column not found', async () => {
    const csv = 'name,score\nalice,10';
    expect(await tryDecodeExportCsv(csv, { passphrase: 'pass' })).toBe(csv);
  });

  it('decrypts encrypted student IDs round-trip', async () => {
    const passphrase = 'test-pass-decode';
    await startCryptoSession(passphrase);
    // Build an encrypted CSV first
    const preview = {
      headers: ['student_id', 'score'],
      rows: [['alice', '10']],
    };
    const { csv: encryptedCsv } = await buildSourceCsv(preview, 'student_id', {
      passphrase,
    });
    // Now decode it
    const decoded = await tryDecodeExportCsv(encryptedCsv, { passphrase });
    expect(decoded).toContain('alice');
  });

  it('passes through non-encrypted student IDs', async () => {
    const csv = 'student_id,score\nalice,10';
    const result = await tryDecodeExportCsv(csv, { passphrase: 'anypass' });
    expect(result).toContain('alice');
  });
});
