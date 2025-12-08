import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { AdjustableGradedSubmission } from '../types';
import { buildTotals, computeStats, buildHistogram } from '../helpers';

type Props = {
  items: AdjustableGradedSubmission[];
};

const ResultsStats: React.FC<Props> = ({ items }) => {
  const totals = useMemo(() => buildTotals(items), [items]);

  const totalValues = useMemo(() => totals.map((t) => t.totalPoints), [totals]);
  const maxTotals = useMemo(() => Math.max(1, ...totals.map((t) => t.totalMax)), [totals]);

  const statsPoints = useMemo(() => computeStats(totalValues), [totalValues]);

  const percentValues = useMemo(
    () => totals.map((t) => (t.totalMax > 0 ? (t.totalPoints / t.totalMax) * 100 : 0)),
    [totals]
  );
  const statsPercent = useMemo(() => computeStats(percentValues), [percentValues]);

  const histogramData = useMemo(() => buildHistogram(totalValues, 12, maxTotals), [totalValues, maxTotals]);

  return (
    <div className="space-y-6">
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
          <div className="stat-desc">{statsPercent.mean.toFixed(1)}%</div>
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
          <div className="stat-desc font-mono text-xs">
            {statsPercent.min.toFixed(1)}% – {statsPercent.max.toFixed(1)}%
          </div>
        </div>
      </div>

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
                  <Tooltip formatter={(value: number | string, name: string) => [value, name === 'count' ? 'Count' : name]} />
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

export default ResultsStats;