import React from 'react';
import { Button } from '@components/ui/Button';
import { IconEye } from '@components/ui/Icon';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import type { AdjustableGradedSubmission, AdjustableQuestionResult } from '../types';
import { useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';

type Props = {
  items: AdjustableGradedSubmission[];
  questionIds: string[];
  onView: (studentId: string) => void; // caller decides how to navigate
};

const ResultsOverview: React.FC<Props> = ({ items, questionIds, onView }) => {
  const { passphrase } = useAssessmentPassphrase();

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
                  <DecryptedText value={gs.student_id} passphrase={passphrase} mono size="sm" />
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
                  <Button size="sm" onClick={() => onView(gs.student_id)} leftIcon={<IconEye />}>
                    View
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsOverview;