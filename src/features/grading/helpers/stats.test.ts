import { describe, expect, it } from 'vitest';

import {
  buildDynamicHistogram,
  buildTotals,
  computeQuestionPassRate,
  computeStats,
} from '@features/grading/helpers/stats';

import type { AdjustableSubmission } from '@api/models';

const makeSubmission = (
  id: string,
  resultMap: Record<string, { points?: number; adjusted_points?: number | null; max_points?: number }>
): AdjustableSubmission =>
  ({
    student_id: id,
    result_map: resultMap as AdjustableSubmission['result_map'],
  } as AdjustableSubmission);

describe('buildTotals', () => {
  it('returns empty array for empty input', () => {
    expect(buildTotals([])).toEqual([]);
  });

  it('computes totals using adjusted_points when present', () => {
    const sub = makeSubmission('s1', {
      q1: { points: 2, adjusted_points: 4, max_points: 5 },
    });
    const [row] = buildTotals([sub]);
    expect(row!.totalPoints).toBe(4);
    expect(row!.totalMax).toBe(5);
  });

  it('falls back to points when adjusted_points is null', () => {
    const sub = makeSubmission('s1', {
      q1: { points: 3, adjusted_points: null, max_points: 5 },
    });
    const [row] = buildTotals([sub]);
    expect(row!.totalPoints).toBe(3);
  });

  it('sums multiple questions', () => {
    const sub = makeSubmission('s1', {
      q1: { points: 2, adjusted_points: null, max_points: 5 },
      q2: { points: 3, adjusted_points: null, max_points: 5 },
    });
    const [row] = buildTotals([sub]);
    expect(row!.totalPoints).toBe(5);
    expect(row!.totalMax).toBe(10);
  });
});

describe('computeStats', () => {
  it('returns zero stats for empty array', () => {
    const stats = computeStats([]);
    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
    expect(stats.stdev).toBe(0);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.q1).toBe(0);
    expect(stats.q2).toBe(0);
    expect(stats.q3).toBe(0);
  });

  it('computes stats for a single value', () => {
    const stats = computeStats([5]);
    expect(stats.count).toBe(1);
    expect(stats.mean).toBe(5);
    expect(stats.stdev).toBe(0);
    expect(stats.min).toBe(5);
    expect(stats.max).toBe(5);
    expect(stats.q1).toBe(5);
    expect(stats.q2).toBe(5);
    expect(stats.q3).toBe(5);
  });

  it('computes mean correctly', () => {
    const stats = computeStats([1, 2, 3, 4, 5]);
    expect(stats.mean).toBe(3);
    expect(stats.count).toBe(5);
  });

  it('computes min and max', () => {
    const stats = computeStats([10, 3, 7, 1, 9]);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(10);
  });

  it('computes quartiles for sorted values', () => {
    const stats = computeStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(stats.q1).toBeCloseTo(3.25);
    expect(stats.q2).toBeCloseTo(5.5);
    expect(stats.q3).toBeCloseTo(7.75);
  });

  it('computes stdev for known distribution', () => {
    // Values [2, 4, 4, 4, 5, 5, 7, 9] → population stdev = 2
    const stats = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stats.stdev).toBeCloseTo(2, 0);
  });
});

describe('buildDynamicHistogram', () => {
  it('returns empty array for empty input', () => {
    expect(buildDynamicHistogram([])).toEqual([]);
  });

  it('returns single bin when all values are equal', () => {
    const bins = buildDynamicHistogram([5, 5, 5]);
    expect(bins).toHaveLength(1);
    expect(bins[0]!.count).toBe(3);
  });

  it('total count matches input length', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const bins = buildDynamicHistogram(values);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(values.length);
  });

  it('respects forced binWidth', () => {
    const bins = buildDynamicHistogram([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
      binWidth: 2,
    });
    expect(bins.length).toBeGreaterThan(1);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(11);
  });

  it('caps bin count at maxBins', () => {
    const values = Array.from({ length: 100 }, (_, i) => i);
    const bins = buildDynamicHistogram(values, { maxBins: 5 });
    expect(bins.length).toBeLessThanOrEqual(5);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(100);
  });

  it('produces bins with Freedman-Diaconis auto-width for varied data', () => {
    const values = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const bins = buildDynamicHistogram(values);
    expect(bins.length).toBeGreaterThan(0);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(values.length);
  });
});

describe('computeQuestionPassRate', () => {
  it('returns 0 when totalStudents is 0', () => {
    expect(computeQuestionPassRate([], 'q1', 0)).toBe(0);
  });

  it('returns 0 when no student has the question result', () => {
    const sub = makeSubmission('s1', {});
    expect(computeQuestionPassRate([sub], 'q1', 1)).toBe(0);
  });

  it('returns 1 when all students pass', () => {
    const subs = [
      makeSubmission('s1', { q1: { points: 5, adjusted_points: null, max_points: 5 } }),
      makeSubmission('s2', { q1: { points: 5, adjusted_points: null, max_points: 5 } }),
    ];
    expect(computeQuestionPassRate(subs, 'q1', 2)).toBe(1);
  });

  it('computes partial pass rate', () => {
    const subs = [
      makeSubmission('s1', { q1: { points: 5, adjusted_points: null, max_points: 5 } }),
      makeSubmission('s2', { q1: { points: 3, adjusted_points: null, max_points: 5 } }),
    ];
    expect(computeQuestionPassRate(subs, 'q1', 2)).toBe(0.5);
  });

  it('uses adjusted_points over points when present', () => {
    const subs = [
      makeSubmission('s1', { q1: { points: 3, adjusted_points: 5, max_points: 5 } }),
    ];
    expect(computeQuestionPassRate(subs, 'q1', 1)).toBe(1);
  });
});
