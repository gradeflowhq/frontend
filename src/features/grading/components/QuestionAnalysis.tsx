import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { AdjustableGradedSubmission, AdjustableQuestionResult } from '../types';
import { computeStats } from '../helpers';

type Props = {
  items: AdjustableGradedSubmission[];
  questionIds: string[];
};

const QuestionAnalysis: React.FC<Props> = ({ items, questionIds }) => {
  const totalStudents = items.length;

  const perQuestion = useMemo(() => {
    return questionIds.map((qid) => {
      const results: AdjustableQuestionResult[] = [];
      let maxPointsObserved = 0;

      items.forEach((gs) => {
        const res = (gs.results ?? []).find((r) => r.question_id === qid);
        if (res) {
          results.push(res);
          maxPointsObserved = Math.max(maxPointsObserved, res.max_points ?? 0);
        }
      });

      const attempts = results.length;
      const missing = Math.max(0, totalStudents - attempts);
      const missingRatePct = totalStudents > 0 ? (missing / totalStudents) * 100 : 0;

      const awarded = results.map((r) => (r.adjusted_points ?? r.points) ?? 0);
      const stats = computeStats(awarded);

      const fullCreditCount =
        maxPointsObserved > 0
          ? results.filter((r) => ((r.adjusted_points ?? r.points) ?? 0) >= maxPointsObserved).length
          : 0;
      const difficultyPct = attempts > 0 ? (fullCreditCount / attempts) * 100 : 0;

      const adjustments = results
        .map((r) => (r.adjusted_points ?? null) !== null ? ((r.adjusted_points as number) - r.points) : null)
        .filter((d): d is number => typeof d === 'number');
      const adjustmentCount = adjustments.length;
      const adjustmentAvg = adjustmentCount > 0 ? adjustments.reduce((s, v) => s + v, 0) / adjustmentCount : 0;

      // Histogram (12 bins)
      const bins = 12;
      const counts = new Array(bins).fill(0);
      if (maxPointsObserved > 0) {
        awarded.forEach((v) => {
          const clamped = Math.max(0, Math.min(maxPointsObserved, v));
          const idx = Math.min(bins - 1, Math.floor((clamped / maxPointsObserved) * bins));
          counts[idx] += 1;
        });
      }
      const histogramData = counts.map((c, i) => ({
        binLabel: `${Math.round((i / bins) * (maxPointsObserved || 1))}`,
        count: c,
      }));

      return {
        qid,
        attempts,
        missing,
        missingRatePct,
        stats,
        maxPointsObserved,
        difficultyPct,
        adjustmentCount,
        adjustmentAvg,
        histogramData,
      };
    });
  }, [items, questionIds, totalStudents]);

  const Line: React.FC<{ label: string; right?: React.ReactNode; children?: React.ReactNode }> = ({ label, right, children }) => (
    <div className="flex items-center justify-between py-1">
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-sm">{right ?? children}</div>
    </div>
  );

  const BarLine: React.FC<{ label: string; pct: number; hint?: string }> = ({ label, pct, hint }) => (
    <div className="py-1">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-70">{label}</div>
        <div className="text-xs font-mono">{pct.toFixed(1)}%</div>
      </div>
      <progress className="progress progress-primary w-full" value={Math.max(0, Math.min(100, Math.round(pct)))} max={100} />
      {hint && <div className="text-xs opacity-60 mt-1">{hint}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {perQuestion.map((q) => (
          <div key={q.qid} className="card bg-base-100 border border-base-300 shadow-xs">
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="card-title">
                  <span className="font-mono text-xs">{q.qid}</span>
                </h3>
                <span className="badge badge-ghost">Max Points: {q.maxPointsObserved}</span>
              </div>

              <div className="divide-y divide-base-300">
                <Line label="Attempts" right={<><span className="font-semibold">{q.attempts}</span><span className="opacity-60 ml-1">/ {totalStudents}</span></>} />
                <BarLine label="Missing rate" pct={q.missingRatePct} hint={`${q.attempts} attempts, ${Math.max(0, totalStudents - q.attempts)} missing`} />
                <BarLine label="Difficulty (Passed %)" pct={q.difficultyPct} />
                <Line label="Mean"><span className="font-mono">{q.stats.mean.toFixed(2)}</span></Line>
                <Line label="Median"><span className="font-mono">{q.stats.q2.toFixed(2)}</span></Line>
                <Line label="Std dev"><span className="font-mono">{q.stats.stdev.toFixed(2)}</span></Line>
                <Line label="Range"><span className="font-mono">{q.stats.min.toFixed(2)} – {q.stats.max.toFixed(2)}</span></Line>
                <Line label="Adjustments"><span className="font-mono">{q.adjustmentCount}</span></Line>
                <Line label="Avg Δ points"><span className="font-mono">{q.adjustmentAvg.toFixed(2)}</span></Line>
              </div>

              <div className="pt-2">
                <div className="text-sm mb-1 opacity-70">Distribution</div>
                {q.maxPointsObserved <= 0 || q.histogramData.every(d => d.count === 0) ? (
                  <div className="opacity-60 text-xs">No data</div>
                ) : (
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={q.histogramData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                        <XAxis dataKey="binLabel" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip formatter={(value: any, name: any) => [value, name === 'count' ? 'Count' : name]} />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionAnalysis;