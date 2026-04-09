import { describe, expect, it } from 'vitest';

import { extractQuestionKeys } from '@features/submissions/helpers';

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
