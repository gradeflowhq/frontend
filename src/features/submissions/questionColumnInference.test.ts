import { describe, expect, it } from 'vitest';

import { arraysEqual } from '@features/submissions/questionColumnInference';

describe('arraysEqual', () => {
  it('returns true for two empty arrays', () => {
    expect(arraysEqual([], [])).toBe(true);
  });

  it('returns true for equal arrays', () => {
    expect(arraysEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
  });

  it('returns false for arrays with different lengths', () => {
    expect(arraysEqual(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });

  it('returns false for arrays with different values', () => {
    expect(arraysEqual(['a', 'b', 'c'], ['a', 'x', 'c'])).toBe(false);
  });

  it('is order-sensitive', () => {
    expect(arraysEqual(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});
