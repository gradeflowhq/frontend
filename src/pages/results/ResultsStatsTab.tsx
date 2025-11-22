import React, { useMemo } from 'react';
import type { AdjustableGradedSubmission } from '../../api/models';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type TotalRow = { id: string; totalPoints: number; totalMax: number };

type Stats = {
  count: number;
  mean: number;
  stdev: number;
  q1: number;
  q2: number; // median
  q3: number;
  min: number;
  max: number;
};

const computeStats = (values: number[]): Stats => {
  const n = values.length;
  if (n === 0) return { count: 0, mean: 0, stdev: 0, q1: 0, q2: 0, q3: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);

  // linear interpolation percentiles
  const interp = (p: number) => {
    if (n === 1) return sorted[0];
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const f = idx - lo;
    return sorted[lo] + (sorted[hi] - sorted[lo]) * f;
  };

  const q1 = interp(25);
  const q2 = interp(50);
  const q3 = interp(75);
  return { count: n, mean, stdev, q1, q2, q3, min: sorted[0], max: sorted[n - 1] };
};

type Props = {
  items: AdjustableGradedSubmission[];
  totals: TotalRow[];
};

const ResultsStatsTab: React.FC<Props> = ({ items, totals }) => {
  // Aggregate totals and percentages
  const { totalValues, percentValues, maxTotals } = useMemo(() => {
    const vals = totals.map((t) => t.totalPoints);
    const maxs = totals.map((t) => t.totalMax);
    const globalMax = Math.max(1, ...maxs);
    const percents = totals.map((t) => (t.totalMax > 0 ? (t.totalPoints / t.totalMax) * 100 : 0));
    return { totalValues: vals, percentValues: percents, maxTotals: globalMax };
  }, [totals]);

  const statsPoints = useMemo(() => computeStats(totalValues), [totalValues]);
  const statsPercent = useMemo(() => computeStats(percentValues), [percentValues]);

  // Build data for Recharts: histogram of total points
  const histogramData = useMemo(() => {
    if (!totalValues.length || maxTotals <= 0) return [];
    const bins = 12;
    const counts = new Array(bins).fill(0);
    totalValues.forEach((v) => {
      const clamped = Math.max(0, Math.min(maxTotals, v));
      const idx = Math.min(bins - 1, Math.floor((clamped / maxTotals) * bins));
      counts[idx] += 1;
    });
    return counts.map((c, i) => ({
      bin: Math.round((i / bins) * maxTotals),
      count: c,
    }));
  }, [totalValues, maxTotals]);

  return (
    <div className="space-y-6">

      {/* daisyui stats: mean, stdev, min, max (points) */}
      <div className="stats bg-base-100 shadow w-full">
        <div className="stat">
          <div className="stat-title">Students</div>
          <div className="stat-value">{statsPoints.count}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Mean total</div>
          <div className="stat-value">
            <span className="font-mono">{statsPoints.mean.toFixed(2)}</span>
            <span className="opacity-70 ml-1">/ {maxTotals}</span>
          </div>
          <div className="stat-desc">
            {(statsPercent.mean).toFixed(1)}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Std dev</div>
          <div className="stat-value">{statsPoints.stdev.toFixed(2)}</div>
          <div className="stat-desc">{statsPercent.stdev.toFixed(1)}%</div>
        </div>
        <div className="stat">
          <div className="stat-title">Min - Max</div>
          <div className="stat-value">
            <span className="font-mono">{statsPoints.min.toFixed(2)}</span>
            <span className="opacity-70"> - {statsPoints.max.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* daisyui stats: q1, q2 (median), q3 */}
      <div className="stats bg-base-100 shadow w-full">
        <div className="stat">
          <div className="stat-title">Q1</div>
          <div className="stat-value">{statsPoints.q1.toFixed(2)}</div>
          <div className="stat-desc">{statsPercent.q1.toFixed(1)}%</div>
        </div>
        <div className="stat">
          <div className="stat-title">Median (Q2)</div>
          <div className="stat-value">{statsPoints.q2.toFixed(2)}</div>
          <div className="stat-desc">{statsPercent.q2.toFixed(1)}%</div>
        </div>
        <div className="stat">
          <div className="stat-title">Q3</div>
          <div className="stat-value">{statsPoints.q3.toFixed(2)}</div>
          <div className="stat-desc">{statsPercent.q3.toFixed(1)}%</div>
        </div>
      </div>

      {/* recharts: distribution */}
      <div className="card bg-base-100 border border-base-300 shadow-xs">
        <div className="card-body">
          <h3 className="card-title mb-2">Distribution</h3>
          {histogramData.length === 0 ? (
            <div className="opacity-60 text-xs">No data</div>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={histogramData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <XAxis dataKey="bin" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(value: any, name: any) => [value, name === 'count' ? 'Count' : name]} />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsStatsTab;