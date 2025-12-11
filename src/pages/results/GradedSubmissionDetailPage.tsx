import React, { useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import AnswerText from '@components/common/AnswerText';
import ConfirmDialog from '@components/common/ConfirmDialog';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import ErrorAlert from '@components/common/ErrorAlert';
import { Button } from '@components/ui/Button';
import {
  IconChevronLeft,
  IconChevronRight,
  IconSave,
  IconCheckCircle,
  IconEdit,
  IconAlertCircle,
  IconTrash,
  IconChevronDown,
} from '@components/ui/Icon';
import { IconButton } from '@components/ui/IconButton';
import LoadingButton from '@components/ui/LoadingButton';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useGrading, useAdjustGrading } from '@features/grading/hooks';
import { friendlyRuleLabel } from '@features/rules/helpers';
import { isEncrypted } from '@utils/crypto';
import { natsort } from '@utils/sort';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { useToast } from '@components/common/ToastProvider';

import type {
  AdjustableGradedSubmission,
  AdjustableQuestionResult,
  GradeAdjustmentRequest,
  GradeAdjustment,
} from '@api/models';

const GradedSubmissionDetailInner: React.FC<{ assessmentId: string; encodedStudentId: string }> = ({ assessmentId, encodedStudentId }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const safeId = assessmentId;
  const enabled = true;

  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const [encryptedDetected] = useState<boolean>(() => isEncrypted(encodedStudentId));
  React.useEffect(() => {
    if (encryptedDetected) notifyEncryptedDetected();
  }, [encryptedDetected, notifyEncryptedDetected]);

  const { data, isLoading, isError, error } = useGrading(safeId, enabled);
  const adjustMutation = useAdjustGrading(safeId);

  const submissions: AdjustableGradedSubmission[] = data?.graded_submissions ?? [];
  const studentIds = useMemo(() => submissions.map((s) => s.student_id).sort(natsort), [submissions]);
  const { decryptedIds, isDecrypting: isDecryptingIds } = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  const index = submissions.findIndex((s) => s.student_id === encodedStudentId);
  const current = index >= 0 ? submissions[index] : null;
  const prevId = index > 0 ? submissions[index - 1].student_id : null;
  const nextId = index >= 0 && index < submissions.length - 1 ? submissions[index + 1].student_id : null;

  const sortedResults = useMemo(() => {
    if (!current?.results) return [] as AdjustableQuestionResult[];
    return [...current.results].sort((a, b) => natsort(a.question_id, b.question_id));
  }, [current]);

  type EditState = Record<string, { points?: number; feedback?: string }>;
  const [editing, setEditing] = useState<EditState>({});
  const [openEdits, setOpenEdits] = useState<Record<string, boolean>>({});
  const [removeAdjustQid, setRemoveAdjustQid] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const pickerInputRef = useRef<HTMLInputElement | null>(null);

  const startEdit = (qid: string, res: AdjustableQuestionResult) => {
    setOpenEdits((prev) => ({ ...prev, [qid]: true }));
    setEditing((prev) => ({
      ...prev,
      [qid]: {
        points: res.adjusted_points ?? res.points,
        feedback: res.adjusted_feedback ?? res.feedback,
      },
    }));
  };

  const cancelEdit = (qid: string) => {
    setOpenEdits((prev) => ({ ...prev, [qid]: false }));
    setEditing((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  };

  const hasAnyChange = useMemo(() => Object.keys(editing).length > 0, [editing]);

  const studentOptions = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return studentIds
      .map((id) => {
        const display = decryptedIds[id] ?? id;
        return { encoded: id, display };
      })
      .filter(({ display }) => display.toLowerCase().includes(q));
  }, [decryptedIds, pickerQuery, studentIds]);

  const resetEdits = () => {
    setEditing({});
    setOpenEdits({});
  };

  const onSave = () => {
    if (!current) return;
    const adjustments: GradeAdjustment[] = Object.entries(editing).map(([qid, e]) => ({
      student_id: current.student_id,
      question_id: qid,
      adjusted_points: e.points ?? null,
      adjusted_feedback: e.feedback ?? null,
    }));
    if (!adjustments.length) return;

    const payload: GradeAdjustmentRequest = { adjustments };
    adjustMutation.mutate(payload, {
      onSuccess: () => {
        resetEdits();
        toast.success('Adjustments saved');
      },
      onError: () => toast.error('Save failed'),
    });
  };

  const gotoPrev = () => {
    if (prevId) navigate(`/results/${safeId}/${encodeURIComponent(prevId)}`);
  };
  const gotoNext = () => {
    if (nextId) navigate(`/results/${safeId}/${encodeURIComponent(nextId)}`);
  };

  React.useEffect(() => {
    setPickerQuery('');
  }, [encodedStudentId]);

  if (!enabled) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }
  if (isLoading) return <div className="alert alert-info"><span>Loading submission...</span></div>;
  if (isError) return <ErrorAlert error={error} />;
  if (!current) return <div className="alert alert-warning"><span>Submission not found.</span></div>;

  const originalTotalPoints = sortedResults.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const adjustedTotalPoints = sortedResults.reduce(
    (sum, r) =>
      sum + (r.adjusted_points !== null && r.adjusted_points !== undefined ? r.adjusted_points : (r.points ?? 0)),
    0
  );
  const totalMax = sortedResults.reduce((sum, r) => sum + (r.max_points ?? 0), 0);
  const adjustmentsCount = sortedResults.filter(
    (r) =>
      (r.adjusted_points !== null && r.adjusted_points !== undefined) ||
      (r.adjusted_feedback !== null && r.adjusted_feedback !== undefined)
  ).length;

  const originalPct = totalMax > 0 ? (originalTotalPoints / totalMax) * 100 : 0;
  const adjustedPct = totalMax > 0 ? (adjustedTotalPoints / totalMax) * 100 : 0;
  const delta = adjustedTotalPoints - originalTotalPoints;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/results/${safeId}`)} leftIcon={<IconChevronLeft />}>
            Back
          </Button>
          <div
            className={`dropdown`}
          >
            <div tabIndex={0} role="button" className="btn m-1">
              <DecryptedText value={encodedStudentId} passphrase={passphrase} mono size="sm" /><IconChevronDown />
            </div>
            <div
              tabIndex={0}
              className={`dropdown-content card card-sm bg-base-100 z-1 w-64 shadow-md`}
            >
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="Search students"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  ref={pickerInputRef}
                />
                <div className="max-h-60 overflow-y-auto divide-y divide-base-200">
                  {studentOptions.length === 0 && (
                    <div className="py-2 text-sm opacity-70">No students match your search.</div>
                  )}
                  {studentOptions.map((opt) => (
                    <button
                      key={opt.encoded}
                      type="button"
                      className="w-full text-left btn btn-ghost btn-sm justify-start"
                      onClick={() => {
                        navigate(`/results/${safeId}/${encodeURIComponent(opt.encoded)}`);
                      }}
                    >
                      <DecryptedText value={opt.encoded} passphrase={passphrase} mono size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {isDecryptingIds && <span className="badge badge-ghost badge-sm">Decrypting IDs...</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasAnyChange && (
            <LoadingButton
              variant="primary"
              onClick={onSave}
              isLoading={adjustMutation.isPending}
              title="Save adjustments for edited questions"
              leftIcon={<IconSave />}
            >
              Save Adjustments
            </LoadingButton>
          )}
          <IconButton icon={<IconChevronLeft />} onClick={gotoPrev} disabled={!prevId} aria-label="Previous" />
          <IconButton icon={<IconChevronRight />} onClick={gotoNext} disabled={!nextId} aria-label="Next" />
        </div>
      </div>
      {adjustMutation.isError && <ErrorAlert error={adjustMutation.error} />}

      <div className="stats shadow bg-base-100 w-full">
        <div className="stat">
          <div className="stat-title">Total (Original)</div>
          <div className="stat-value">
            <span className="font-mono">{originalTotalPoints}</span>
            <span className="opacity-70 ml-1">/ {totalMax}</span>
          </div>
          <div className="stat-desc">
            <div className="flex items-center gap-2">
              <progress className="progress progress-primary w-40" value={Math.round(originalPct)} max={100} />
              <span className="font-mono text-xs">{originalPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Total (Adjusted)</div>
          <div className="stat-value">
            <span className="font-mono">{adjustedTotalPoints}</span>
            <span className="opacity-70 ml-1">/ {totalMax}</span>
          </div>
          <div className="stat-desc">
            <div className="flex items-center gap-2">
              <progress className="progress progress-secondary w-40" value={Math.round(adjustedPct)} max={100} />
              <span className="font-mono text-xs">{adjustedPct.toFixed(1)}%</span>
              <span className={`ml-2 font-mono text-xs ${delta >= 0 ? 'text-success' : 'text-error'}`}>
                Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Adjustments</div>
          <div className="stat-value">{adjustmentsCount}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 shadow-xs">
        <table className="table table-sm table-pin-cols w-full">
          <thead>
            <tr>
              <td>Question ID</td>
              <td>Rule</td>
              <td title="Passed" aria-label="Passed">
                <IconCheckCircle />
              </td>
              <td>Answer</td>
              <td>Points</td>
              <td>Feedback</td>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((res) => {
              const qid = res.question_id;
              const isEditing = !!openEdits[qid];
              const local = editing[qid];

              const adjustedExists =
                (res.adjusted_points !== undefined && res.adjusted_points !== null) ||
                (res.adjusted_feedback !== undefined && res.adjusted_feedback !== null);

              return (
                <tr key={qid} className={adjustedExists ? 'bg-warning/10' : ''}>
                  <td className="align-top">
                    <span className="font-mono text-sm">{qid}</span>
                  </td>

                  <td className="align-top">
                    <span className="badge badge-ghost font-mono text-xs">{friendlyRuleLabel(res.rule)}</span>
                  </td>

                  <td className="align-top">
                    { !res.graded ? (
                      <span className="badge badge-warning">Ungraded</span>
                    ) : res.passed ? (
                      <IconCheckCircle className="text-success" aria-label="Passed" />
                    ) : (
                      <IconAlertCircle className="text-error" aria-label="Failed" />
                    )}
                  </td>

                  <td className="align-top">
                    <div className="max-w-xs">
                      <AnswerText value={current.answer_map?.[qid]} maxLength={100} />
                    </div>
                  </td>

                  <td className="align-top">
                    {!isEditing ? (
                      <div className="space-y-1">
                        <div>
                          <span className="font-mono">{res.adjusted_points ?? res.points}</span>
                          <span className="opacity-70 ml-1">/ {res.max_points}</span>
                        </div>
                        {adjustedExists && res.adjusted_points !== null && res.adjusted_points !== undefined && (
                          <div className="badge badge-ghost badge-sm font-mono">
                            Original: {res.points} / {res.max_points}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="input input-bordered input-sm w-24"
                          value={local?.points ?? ''}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [qid]: {
                                ...prev[qid],
                                points: e.target.value === '' ? undefined : Number(e.target.value),
                              },
                            }))
                          }
                          placeholder="Points"
                          min={0}
                          max={res.max_points}
                        />
                        <span className="opacity-70 text-xs">/ {res.max_points}</span>
                      </div>
                    )}
                  </td>

                  <td className="align-top">
                    {!isEditing ? (
                      <div className="space-y-1">
                        <div className="whitespace-pre-line">{(res.adjusted_feedback ?? res.feedback) || <span className="opacity-60">—</span>}</div>
                        {adjustedExists && res.adjusted_feedback !== null && res.adjusted_feedback !== undefined && (
                          <details className="collapse collapse-arrow bg-base-200 mt-1">
                            <summary className="collapse-title text-xs py-1 min-h-0">Original</summary>
                            <div className="collapse-content text-xs whitespace-pre-line">
                              {res.feedback || <span className="opacity-60">—</span>}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <textarea
                        className="textarea textarea-bordered textarea-sm w-full"
                        value={local?.feedback ?? ''}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [qid]: {
                              ...prev[qid],
                              feedback: e.target.value === '' ? undefined : e.target.value,
                            },
                          }))
                        }
                        placeholder="Feedback"
                      />
                    )}
                  </td>

                  <th className="align-top">
                    {!isEditing ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => startEdit(qid, res)} leftIcon={<IconEdit />}>
                          Edit
                        </Button>
                        {adjustedExists && (
                          <Button
                            size="sm"
                            variant="error"
                            onClick={() => setRemoveAdjustQid(qid)}
                            title="Remove Adjustment"
                            leftIcon={<IconTrash />}
                          >
                            Remove Adjustment
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => cancelEdit(qid)}>
                        Cancel
                      </Button>
                    )}
                  </th>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!removeAdjustQid}
        title="Remove Adjustment"
        message="This will revert the adjusted points and feedback for this question. Proceed?"
        confirmLoading={adjustMutation.isPending}
        confirmLoadingLabel="Removing..."
        confirmText="Remove"
        onConfirm={() => {
          if (!current || !removeAdjustQid) return;
          const payload: GradeAdjustmentRequest = {
            adjustments: [
              {
                student_id: current.student_id,
                question_id: removeAdjustQid,
                adjusted_points: null,
                adjusted_feedback: null,
              },
            ],
          };
          adjustMutation.mutate(payload, {
            onSuccess: () => {
              setRemoveAdjustQid(null);
              toast.success('Adjustment removed');
            },
            onError: () => toast.error('Remove failed'),
          });
        }}
        onCancel={() => setRemoveAdjustQid(null)}
      />
    </section>
  );
};

const GradedSubmissionDetailPage: React.FC = () => {
  const { assessmentId, studentId } = useParams<{ assessmentId: string; studentId: string }>();
  if (!assessmentId || !studentId) {
    return <div className="alert alert-error"><span>Assessment ID or Student ID is missing.</span></div>;
  }
  return (
    <AssessmentPassphraseProvider assessmentId={assessmentId}>
      <GradedSubmissionDetailInner assessmentId={assessmentId} encodedStudentId={studentId} />
    </AssessmentPassphraseProvider>
  );
};

export default GradedSubmissionDetailPage;