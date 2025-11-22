import React from 'react';
import { isEncrypted } from '../../utils/crypto';
import type { AdjustableGradedSubmission, AdjustableQuestionResult } from '../../api/models';

const LockIcon: React.FC<{ title?: string }> = ({ title }) => (
  <span className="inline-flex items-center tooltip" data-tip={title ?? 'Stored encrypted on server'}>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 opacity-70" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
    </svg>
  </span>
);

type Props = {
  assessmentId: string;
  items: AdjustableGradedSubmission[];
  questionIds: string[];
  displayedIdsMap: Map<string, string>;
  navigate: (to: string) => void;
};

const ResultsOverviewTab: React.FC<Props> = ({ assessmentId, items, questionIds, displayedIdsMap, navigate }) => {
  const renderPercentBar = (value: number, max: number) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
      <div className="mt-1 flex items-center gap-2">
        <progress className="progress progress-primary w-24" value={pct} max={100} />
        <span className="text-xs font-mono">{pct}%</span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 shadow-xs">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Student ID</th>
            {questionIds.map((qid) => (
              <th key={qid}>
                <span className="font-mono text-xs">{qid}</span>
              </th>
            ))}
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((gs) => {
            const displaySid = displayedIdsMap.get(gs.student_id) ?? gs.student_id;
            const enc = isEncrypted(gs.student_id);
            const resMap = new Map<string, AdjustableQuestionResult>();
            (gs.results ?? []).forEach((r) => resMap.set(r.question_id, r));
            const totalPoints = (gs.results ?? []).reduce(
              (sum, r) => sum + (r.adjusted_points ?? r.points),
              0
            );
            const totalMax = (gs.results ?? []).reduce((sum, r) => sum + r.max_points, 0);

            return (
              <tr key={gs.student_id} className="hover">
                <td>
                  <div className="flex items-center">
                    <span className="font-mono text-sm">{displaySid}</span>
                    {enc && <LockIcon title="Stored encrypted on server" />}
                  </div>
                </td>

                {questionIds.map((qid) => {
                  const r = resMap.get(qid);
                  if (!r) return <td key={`${gs.student_id}:${qid}`}>—</td>;
                  const adjustedExists = r.adjusted_points !== undefined && r.adjusted_points !== null;
                  const pointsDisplay = adjustedExists ? (r.adjusted_points as number) : r.points;
                  const maxPoints = r.max_points ?? 0;

                  return (
                    <td key={`${gs.student_id}:${qid}`} className={adjustedExists ? 'bg-warning/10' : ''}>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">
                          {pointsDisplay} / {maxPoints}
                        </span>
                        {adjustedExists && (
                          <span className="font-mono text-[11px] opacity-70">
                            Original: {r.points} / {maxPoints}
                          </span>
                        )}
                        {renderPercentBar(pointsDisplay ?? 0, maxPoints)}
                      </div>
                    </td>
                  );
                })}

                <td>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">
                      {totalPoints} / {totalMax}
                    </span>
                    {renderPercentBar(totalPoints, totalMax)}
                  </div>
                </td>

                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      navigate(`/results/${assessmentId}/${encodeURIComponent(gs.student_id)}`)
                    }
                    title="View submission details"
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsOverviewTab;