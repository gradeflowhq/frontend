import { describe, expect, it } from 'vitest';

import { compareDateDesc, natsort } from '@utils/sort';

describe('natsort', () => {
  it('sorts strings alphabetically', () => {
    expect(['b', 'a', 'c'].sort(natsort)).toEqual(['a', 'b', 'c']);
  });

  it('sorts numerically within strings (natural order)', () => {
    expect(['q10', 'q2', 'q1'].sort(natsort)).toEqual(['q1', 'q2', 'q10']);
  });

  it('returns 0 for identical strings', () => {
    expect(natsort('abc', 'abc')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(natsort('A', 'a')).toBe(0);
  });

  it('handles mixed alphanumeric strings', () => {
    expect(['question10', 'question2', 'question1'].sort(natsort)).toEqual([
      'question1',
      'question2',
      'question10',
    ]);
  });
});

describe('compareDateDesc', () => {
  const getDate = (item: { date: string | null }) => item.date;

  it('sorts more recent dates first', () => {
    const items = [
      { date: '2023-01-01' },
      { date: '2024-01-01' },
      { date: '2022-01-01' },
    ];
    const sorted = [...items].sort(compareDateDesc(getDate));
    expect(sorted[0].date).toBe('2024-01-01');
    expect(sorted[2].date).toBe('2022-01-01');
  });

  it('places null dates last', () => {
    const items = [{ date: null }, { date: '2024-01-01' }];
    const sorted = [...items].sort(compareDateDesc(getDate));
    expect(sorted[0].date).toBe('2024-01-01');
    expect(sorted[1].date).toBeNull();
  });

  it('returns 0 for two null dates', () => {
    expect(compareDateDesc(getDate)({ date: null }, { date: null })).toBe(0);
  });

  it('returns 0 for two equal dates', () => {
    const d = { date: '2024-01-01' };
    expect(compareDateDesc(getDate)(d, d)).toBe(0);
  });
});
