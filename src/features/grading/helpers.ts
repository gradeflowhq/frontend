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

type HistogramOptions = {
  maxBins?: number;
  binWidth?: number | null;
};

// Build histogram bins with dynamic count but equal-sized bins
// - If binWidth is provided, bin count is derived from range / binWidth (min/max auto)
// - Otherwise uses a Freedman–Diaconis inspired automatic width capped by maxBins
export const buildDynamicHistogram = (
  values: number[],
  { maxBins = 12, binWidth: forcedWidth }: HistogramOptions = {},
): { binLabel: string; count: number }[] => {
  if (!values.length) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // Helper to format bin edges
  const formatEdge = (value: number) => {
    if (!isFinite(value)) return '0';
    const decimals = Math.abs(value) >= 10 ? 1 : 2;
    return Number(value.toFixed(decimals)).toString();
  };

  if (range === 0) {
    return [{ binLabel: formatEdge(min), count: n }];
  }

  let width: number;
  let binCount: number;

  if (forcedWidth && forcedWidth > 0) {
    width = forcedWidth;
    binCount = Math.max(1, Math.ceil(range / width));
  } else {
    const q1 = sorted[Math.floor((n - 1) * 0.25)];
    const q3 = sorted[Math.floor((n - 1) * 0.75)];
    const iqr = q3 - q1;
    // Freedman–Diaconis bin width; fall back to range-based split if IQR is zero
    const fdWidth = iqr > 0 ? (2 * iqr) / Math.cbrt(n) : range / Math.min(maxBins, Math.max(1, Math.round(Math.sqrt(n))));
    const autoWidth = fdWidth > 0 ? fdWidth : range / Math.min(maxBins, Math.max(1, Math.round(Math.sqrt(n))));
    width = autoWidth;
    binCount = Math.max(1, Math.min(maxBins, Math.ceil(range / width)));
    width = range / binCount; // normalize width so bins span the full range
  }

  const counts = Array(binCount).fill(0);
  values.forEach((v) => {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
    counts[idx] += 1;
  });

  return counts.map((c, i) => {
    const start = min + i * width;
    const end = i === binCount - 1 ? max : start + width;
    return {
      binLabel: start === end ? formatEdge(start) : `${formatEdge(start)}-${formatEdge(end)}`,
      count: c,
    };
  });
};