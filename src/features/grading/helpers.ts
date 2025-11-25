import type { AdjustableGradedSubmission, TotalsRow } from './types';

// Compute totals per submission
export const buildTotals = (items: AdjustableGradedSubmission[]): TotalsRow[] =>
  items.map((gs) => {
    const totalPoints = (gs.results ?? []).reduce(
      (sum, r) => sum + (r.adjusted_points ?? r.points),
      0
    );
    const totalMax = (gs.results ?? []).reduce((sum, r) => sum + r.max_points, 0);
    return { id: gs.student_id, totalPoints, totalMax };
  });

// Basic stats utilities
export type Stats = { count: number; mean: number; stdev: number; q1: number; q2: number; q3: number; min: number; max: number };

export const computeStats = (values: number[]): Stats => {
  const n = values.length;
  if (n === 0) return { count: 0, mean: 0, stdev: 0, q1: 0, q2: 0, q3: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  const interp = (p: number) => {
    if (n === 1) return sorted[0];
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const f = idx - lo;
    return sorted[lo] + (sorted[hi] - sorted[lo]) * f;
  };
  return { count: n, mean, stdev, q1: interp(25), q2: interp(50), q3: interp(75), min: sorted[0], max: sorted[n - 1] };
};

// Build histogram bins (e.g., 12 bins)
export const buildHistogram = (values: number[], bins: number, maxValue: number): { bin: number; count: number }[] => {
  const counts = new Array(bins).fill(0);
  const max = Math.max(1, maxValue);
  values.forEach((v) => {
    const clamped = Math.max(0, Math.min(max, v));
    const idx = Math.min(bins - 1, Math.floor((clamped / max) * bins));
    counts[idx] += 1;
  });
  return counts.map((c, i) => ({ bin: Math.round((i / bins) * max), count: c }));
};