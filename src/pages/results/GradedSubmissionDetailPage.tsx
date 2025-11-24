import React, { useMemo, useState, useCallback } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconSave,
  IconCheckCircle,
  IconEdit,
  IconAlertCircle,
} from '../../components/ui/icons';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import ErrorAlert from '../../components/common/ErrorAlert';
import EncryptedDataGuard from '../../components/common/encryptions/EncryptedDataGuard';
import DecryptedText from '../../components/common/encryptions/DecryptedText';
import { isEncrypted } from '../../utils/crypto';
import { buildPassphraseKey } from '../../utils/passphrase';
import { usePassphrase } from '../../hooks/usePassphrase';
import { friendlyRuleLabel } from '../../utils/rulesHelpers';
import type {
  GradingResponse,
  AdjustableGradedSubmission,
  AdjustableQuestionResult,
  GradeAdjustmentRequest,
  GradeAdjustment,
} from '../../api/models';

type EditState = Record<string, { points?: number; feedback?: string }>; // keyed by question_id

const GradedSubmissionDetailPage: React.FC = () => {
  const { assessmentId, studentId: rawStudentId } = useParams<{ assessmentId: string; studentId: string }>();
  const encodedStudentId = rawStudentId ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (!assessmentId) {
    return <div className="alert alert-error"><span>Assessment ID is missing.</span></div>;
  }

  // Passphrase state via hook (standardised storage key)
  const storageKey = buildPassphraseKey(assessmentId);
  const { passphrase, setPassphrase } = usePassphrase(storageKey);

  // Encrypted data guard prompt only when the encoded ID is encrypted
  const [encryptedDetected] = useState<boolean>(() => isEncrypted(encodedStudentId));

  const onPassphraseReady = useCallback((pp: string | null) => {
    setPassphrase(pp);
  }, [setPassphrase]);

  // Load graded submissions
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['grading', assessmentId],
    queryFn: async () =>
      (await api.getGradingAssessmentsAssessmentIdGradingGet(assessmentId)).data as GradingResponse,
    enabled: !!assessmentId,
    staleTime: 30_000,
  });

  const submissions: AdjustableGradedSubmission[] = data?.graded_submissions ?? [];
  const index = submissions.findIndex((s) => s.student_id === encodedStudentId);
  const current = index >= 0 ? submissions[index] : null;

  const prevId = index > 0 ? submissions[index - 1].student_id : null;
  const nextId = index >= 0 && index < submissions.length - 1 ? submissions[index + 1].student_id : null;

  // Local edit state for adjustments
  const [editing, setEditing] = useState<EditState>({});
  const [openEdits, setOpenEdits] = useState<Record<string, boolean>>({});

  const adjustMutation = useMutation({
    mutationKey: ['grading', assessmentId, 'adjust'],
    mutationFn: async (payload: GradeAdjustmentRequest) =>
      (await api.adjustGradingAssessmentsAssessmentIdGradingAdjustPost(assessmentId, payload)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['grading', assessmentId] });
      setEditing({});
      setOpenEdits({});
    },
  });

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

  const onSave = async () => {
    if (!current) return;
    const adjustments: GradeAdjustment[] = Object.entries(editing).map(([qid, e]) => ({
      student_id: current.student_id,
      question_id: qid,
      adjusted_points: e.points ?? null,
      adjusted_feedback: e.feedback ?? null,
    }));
    if (!adjustments.length) return;
    await adjustMutation.mutateAsync({ adjustments });
  };

  const gotoPrev = () => {
    if (prevId) navigate(`/results/${assessmentId}/${encodeURIComponent(prevId)}`);
  };
  const gotoNext = () => {
    if (nextId) navigate(`/results/${assessmentId}/${encodeURIComponent(nextId)}`);
  };

  if (isLoading) return <div className="alert alert-info"><span>Loading submission...</span></div>;
  if (isError) return <ErrorAlert error={error} />;
  if (!current) return <div className="alert alert-warning"><span>Submission not found.</span></div>;

  // Summary stats
  const originalTotalPoints = (current.results ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);
  const adjustedTotalPoints = (current.results ?? []).reduce(
    (sum, r) =>
      sum + (r.adjusted_points !== null && r.adjusted_points !== undefined ? r.adjusted_points : (r.points ?? 0)),
    0
  );
  const totalMax = (current.results ?? []).reduce((sum, r) => sum + (r.max_points ?? 0), 0);
  const adjustmentsCount = (current.results ?? []).filter(
    (r) =>
      (r.adjusted_points !== null && r.adjusted_points !== undefined) ||
      (r.adjusted_feedback !== null && r.adjusted_feedback !== undefined)
  ).length;

  const originalPct = totalMax > 0 ? (originalTotalPoints / totalMax) * 100 : 0;
  const adjustedPct = totalMax > 0 ? (adjustedTotalPoints / totalMax) * 100 : 0;
  const delta = adjustedTotalPoints - originalTotalPoints;

  return (
    <section className="space-y-4">
      <EncryptedDataGuard
        storageKey={storageKey}
        encryptedDetected={encryptedDetected}
        onPassphraseReady={onPassphraseReady}
        currentPassphrase={passphrase}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/results/${assessmentId}`)}
            leftIcon={<IconChevronLeft />}
          >
            Back
          </Button>
          <span className="font-mono text-sm badge badge-ghost flex items-center">
            <DecryptedText value={encodedStudentId} passphrase={passphrase} mono size="sm" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasAnyChange && (
            <Button
              variant="primary"
              onClick={onSave}
              disabled={adjustMutation.isPending}
              title="Save adjustments for edited questions"
              leftIcon={<IconSave />}
              loading={adjustMutation.isPending}
            >
              Save Adjustments
            </Button>
          )}
          <IconButton icon={<IconChevronLeft />} onClick={gotoPrev} disabled={!prevId} aria-label="Previous" />
          <IconButton icon={<IconChevronRight />} onClick={gotoNext} disabled={!nextId} aria-label="Next" />
        </div>
      </div>
      {adjustMutation.isError && <ErrorAlert error={adjustMutation.error} />}

      {/* Totals/percentages */}
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

      {/* Per-question results and editing */}
      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 shadow-xs">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Question ID</th>
              <th>Rule</th>
              <th title="Passed" aria-label="Passed">
                <IconCheckCircle />
              </th>
              <th>Points</th>
              <th>Feedback</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(current.results ?? []).map((res) => {
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
                    {res.passed ? (
                      <IconCheckCircle className="text-success" title="Passed" aria-label="Passed" />
                    ) : (
                      <IconAlertCircle className="text-error" title="Failed" aria-label="Failed" />
                    )}
                  </td>

                  <td className="align-top">
                    {!isEditing ? (
                      <div className="space-y-1">
                        <div>
                          <span className="font-mono">{res.adjusted_points ?? res.points}</span>
                          <span className="opacity-70 ml-1">/ {res.max_points}</span>
                        </div>
                        {adjustedExists && res.adjusted_points !== null && res.adjusted_points !== undefined && (
                          <div className="text-xs opacity-70">
                            Original: <span className="font-mono">{res.points}</span>
                            {' '}<span className="opacity-70">/ {res.max_points}</span>
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
                        <div>{(res.adjusted_feedback ?? res.feedback) || <span className="opacity-60">—</span>}</div>
                        {adjustedExists && res.adjusted_feedback !== null && res.adjusted_feedback !== undefined && (
                          <div className="text-xs opacity-70">
                            Original: {res.feedback || <span className="opacity-60">—</span>}
                          </div>
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

                  <td className="align-top">
                    {!isEditing ? (
                      <Button size="sm" onClick={() => startEdit(qid, res)} leftIcon={<IconEdit />}>
                        Edit
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => cancelEdit(qid)}>
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default GradedSubmissionDetailPage;