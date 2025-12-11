import React, { useMemo } from 'react';

import AnswerText from '@components/common/AnswerText';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import ErrorAlert from '@components/common/ErrorAlert';
import TableSkeleton from '@components/common/TableSkeleton';
import { IconAlertCircle, IconCheckCircle } from '@components/ui/Icon';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { natsort } from '@utils/sort';

import type { AdjustableGradedSubmission, AdjustableQuestionResult } from '@features/grading/types';

type Props = {
  items: AdjustableGradedSubmission[];
  loading?: boolean;
  error?: unknown;
  className?: string;
  maxHeightVh?: number;
};

const GradingPreviewPanel: React.FC<Props> = ({ items, loading, error, className, maxHeightVh = 60 }) => {
  const { passphrase } = useAssessmentPassphrase();

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => natsort(a.student_id, b.student_id)),
    [items]
  );

  const targetQid = useMemo(() => {
    for (const gs of sorted) {
      const r = (gs.results ?? [])[0];
      if (r?.question_id) return r.question_id;
    }
    return null;
  }, [sorted]);

  if (loading) {
    return (
      <div className={className}>
        <h4 className="font-semibold mb-2">Preview</h4>
        <TableSkeleton cols={5} rows={5} className="max-h-[60vh]" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={className}>
        <h4 className="font-semibold mb-0">Preview</h4>
        <ErrorAlert error={error} />
      </div>
    );
  }
  // When there is no preview data, do not show the panel at all
  if (!sorted.length) {
    return null;
  }

  return (
    <div className={className}>
      <h4 className="font-semibold mb-2">Preview</h4>
      <div
        className="rounded-box border border-base-300 bg-base-100 shadow-xs"
        style={{ maxHeight: `${maxHeightVh}vh`, overflowX: 'auto', overflowY: 'auto' }}
      >
        <table className="table table-sm table-zebra table-pin-cols w-full min-w-[720px]">
          <thead className="sticky top-0 bg-base-100 z-10">
            <tr>
              <th>Student ID</th>
              <td>{targetQid ? <>Answer ({targetQid})</> : 'Answer'}</td>
              <td>Passed</td>
              <td>Points</td>
              <td>Feedback</td>
            </tr>
          </thead>
          <tbody>
            {sorted.map((gs) => {
              const r: AdjustableQuestionResult | undefined = (gs.results ?? [])[0];
              const passed = !!r?.passed;
              const points = r ? (r.adjusted_points ?? r.points) : 0;
              const max = r?.max_points ?? 0;
              const feedback = r?.adjusted_feedback ?? r?.feedback ?? '';

              const answerRaw = targetQid ? (gs.answer_map?.[targetQid] as unknown) : undefined;

              return (
                <tr key={gs.student_id} className="align-top">
                  <th className="whitespace-pre-wrap break-words z-1">
                    <DecryptedText value={gs.student_id} passphrase={passphrase} mono size="sm" />
                  </th>
                  <td>
                    <AnswerText value={answerRaw} />
                  </td>
                  <td>
                    {passed ? (
                      <IconCheckCircle className="text-success" />
                    ) : (
                      <IconAlertCircle className="text-error" />
                    )}
                  </td>
                  <td className="font-mono text-sm">{points} / {max}</td>
                  <td className="whitespace-pre-wrap break-words">{feedback || <span className="opacity-60">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradingPreviewPanel;