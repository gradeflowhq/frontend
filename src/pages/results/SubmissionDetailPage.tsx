import {
  ActionIcon, Alert, Badge, Box, Button, Center, Checkbox, Collapse, Divider, Group,
  Loader,
  Modal, NumberInput, Paper, Popover, Progress, SegmentedControl, Select,
  SimpleGrid, Stack, Text, Textarea, Tooltip, UnstyledButton,
} from '@mantine/core';
import {
  IconAlertCircle, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconChevronUp, IconCircleCheck, IconDeviceFloppy, IconFilter, IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import AnswerText from '@components/common/AnswerText';
import PageShell from '@components/common/PageShell';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { useGrading, useAdjustGrading } from '@features/grading/api';
import { GradingStatusBanner } from '@features/grading/components';
import { useQuestionSet } from '@features/questions/api';
import { useRubric } from '@features/rubric/api';
import { getRuleDescriptionText } from '@features/rules/helpers';
import { friendlyRuleLabel } from '@features/rules/schema';
import { isEncrypted } from '@utils/crypto';
import { getErrorMessage } from '@utils/error';
import { notifyError, notifyErrorMessage, notifySuccess } from '@utils/notifications';
import { natsort } from '@utils/sort';

import type {
  AdjustableSubmission,
  AdjustableQuestionResult,
  QuestionSetOutputQuestionMap,
} from '@api/models';
import type { RuleValue } from '@features/rules/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResultWithQid = AdjustableQuestionResult & { question_id: string };
type EditState = Record<string, { points?: number; feedback?: string }>;
type StatusFilter = 'all' | 'passed' | 'failed' | 'adjusted';

// ── Helpers ───────────────────────────────────────────────────────────────────

const hasAdjustment = (r: AdjustableQuestionResult): boolean =>
  (r.adjusted_points !== null && r.adjusted_points !== undefined) ||
  (r.adjusted_feedback !== null && r.adjusted_feedback !== undefined);

const effectivePoints = (r: AdjustableQuestionResult): number =>
  r.adjusted_points !== null && r.adjusted_points !== undefined
    ? r.adjusted_points
    : (r.points ?? 0);

// ── Question Card ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  res: ResultWithQid;
  answerValue: unknown;
  questionDescription: string | null;
  ruleDescription: string | null;
  isEditing: boolean;
  editValues: { points?: number; feedback?: string } | undefined;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: (patch: Partial<{ points?: number; feedback?: string }>) => void;
  onRemoveAdjustment: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  res,
  answerValue,
  questionDescription,
  ruleDescription,
  isEditing,
  editValues,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onRemoveAdjustment,
}) => {
  const [expanded, setExpanded] = useState(false);
  const adjusted = hasAdjustment(res);
  const pts = effectivePoints(res);

  const borderColor = adjusted
    ? 'var(--mantine-color-yellow-4)'
    : res.passed
      ? 'var(--mantine-color-green-4)'
      : 'var(--mantine-color-red-4)';

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* ── Collapsed header — always visible ── */}
      <UnstyledButton
        onClick={() => setExpanded((v) => !v)}
        w="100%"
        p="sm"
        style={{ borderRadius: 'inherit' }}
      >
        <Group justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" align="center" wrap="nowrap">
              {res.passed ? (
                <IconCircleCheck size={16} color="var(--mantine-color-green-6)" aria-label="Passed" />
              ) : !res.graded ? (
                <IconAlertCircle size={16} color="var(--mantine-color-yellow-6)" aria-label="Ungraded" />
              ) : (
                <IconAlertCircle size={16} color="var(--mantine-color-red-6)" aria-label="Failed" />
              )}
              <Text ff="monospace" fw={600} size="sm">{res.question_id}</Text>
            </Group>

            {questionDescription && (
              <Text size="xs" c="dimmed" lineClamp={1} style={{ flex: 1, minWidth: 80 }}>
                {questionDescription}
              </Text>
            )}
          </Group>

          <Group gap="xs" wrap="nowrap" align="center">
            <Badge variant="light" color="gray" size="sm" ff="monospace">
              {friendlyRuleLabel(res.rule)}
            </Badge>

            <Text ff="monospace" fw={600} size="sm" style={{ whiteSpace: 'nowrap' }}>
              {pts.toFixed(2)} / {res.max_points}
            </Text>

            {adjusted && (
              <Badge variant="light" color="yellow" size="xs">adj</Badge>
            )}

            {expanded
              ? <IconChevronUp size={14} color="var(--mantine-color-dimmed)" />
              : <IconChevronDown size={14} color="var(--mantine-color-dimmed)" />
            }
          </Group>
        </Group>
      </UnstyledButton>

      {/* ── Expanded detail ── */}
      <Collapse expanded={expanded}>
        <Divider />
        <Stack gap="sm" p="sm">
          {/* Question */}
          {questionDescription && (
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={2}>Question</Text>
              <Text size="sm">{questionDescription}</Text>
            </Box>
          )}

          {/* Rule */}
          {ruleDescription && (
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={2}>Rule</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{ruleDescription}</Text>
            </Box>
          )}

          {/* Answer */}
          <Box>
            <Text size="xs" c="dimmed" fw={500} mb={2}>Answer</Text>
            <AnswerText value={answerValue} maxLength={500} />
          </Box>

          {/* Points */}
          {!isEditing ? (
            <>
              <Box>
                <Text size="xs" c="dimmed" fw={500} mb={2}>Points</Text>
                <Group gap="xs" align="baseline">
                  <Text ff="monospace" fw={600}>{pts.toFixed(2)}</Text>
                  <Text c="dimmed" size="xs">/ {res.max_points}</Text>
                </Group>
              </Box>
              {adjusted && res.adjusted_points !== null && res.adjusted_points !== undefined && res.adjusted_points !== res.points && (
                <Box>
                  <Text size="xs" c="dimmed" fw={500} mb={2}>Original Points</Text>
                  <Group gap="xs" c="dimmed" align="baseline">
                    <Text ff="monospace" fw={600}>{res.points.toFixed(2)}</Text>
                    <Text c="dimmed" size="xs">/ {res.max_points}</Text>
                  </Group>
                </Box>
              )}
            </>
          ) : (
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={2}>Adjusted Points</Text>
              <Group align="center" gap="xs">
                <NumberInput
                  size="xs"
                  w={100}
                  aria-label="Adjusted points"
                  value={editValues?.points ?? ''}
                  onChange={(v) =>
                    onEditChange({ points: v === '' ? undefined : Number(v) })
                  }
                  min={0}
                  max={res.max_points ?? undefined}
                />
                <Text c="dimmed" size="xs">/ {res.max_points}</Text>
              </Group>
            </Box>
          )}

          {/* Feedback */}
          {!isEditing ? (
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={2}>Feedback</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                {(res.adjusted_feedback ?? res.feedback) || <Text component="span" c="dimmed">—</Text>}
              </Text>
              {adjusted && res.adjusted_feedback !== null && res.adjusted_feedback !== undefined && res.adjusted_feedback !== res.feedback && (
                <Box mt="xs">
                  <Text size="xs" c="dimmed" fw={500} mb={2}>Original Feedback</Text>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                    {res.feedback || '—'}
                  </Text>
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={2}>Adjusted Feedback</Text>
              <Textarea
                size="xs"
                aria-label="Adjusted feedback"
                value={editValues?.feedback ?? ''}
                onChange={(e) =>
                  onEditChange({ feedback: e.target.value === '' ? undefined : e.target.value })
                }
                placeholder="Feedback"
                autosize
                minRows={2}
              />
            </Box>
          )}

          {/* Actions */}
          <Group gap="xs" justify="flex-end">
            {!isEditing ? (
              <>
                <Button size="xs" variant="light" leftSection={<IconPencil size={12} />} onClick={onStartEdit}>
                  Edit
                </Button>
                {adjusted && (
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={12} />}
                    onClick={onRemoveAdjustment}
                  >
                    Remove Adjustment
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="xs"
                  leftSection={<IconDeviceFloppy size={12} />}
                  loading={isSaving}
                  onClick={onSaveEdit}
                >
                  Save
                </Button>
                <Button size="xs" variant="default" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </>
            )}
          </Group>
        </Stack>
      </Collapse>
    </Paper>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const SubmissionDetailInner: React.FC<{ assessmentId: string; encodedStudentId: string }> = ({ assessmentId, encodedStudentId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isFromStatistics = location.pathname.includes('/results/statistics/');
  const ap = PATHS.assessment(assessmentId);
  const backPath = isFromStatistics ? ap.results.statistics : ap.results.students;
  const detailPath = isFromStatistics ? ap.results.statistic : ap.results.student;

  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const encryptedDetected = isEncrypted(encodedStudentId);
  useEffect(() => {
    if (encryptedDetected) notifyEncryptedDetected();
  }, [encryptedDetected, notifyEncryptedDetected]);

  const { data, isLoading, isError, error } = useGrading(assessmentId);
  const { data: qsRes } = useQuestionSet(assessmentId, true);
  const { data: rubricData } = useRubric(assessmentId);
  const adjustMutation = useAdjustGrading(assessmentId);

  const questionMap = useMemo<QuestionSetOutputQuestionMap>(
    () => qsRes?.question_set?.question_map ?? {},
    [qsRes],
  );

  const ruleDescriptionByQid = useMemo(() => {
    const map: Record<string, string | null> = {};
    const rules = (rubricData?.rubric?.rules ?? []) as RuleValue[];
    for (const rule of rules) {
      const qid = (rule as { question_id?: string }).question_id;
      if (qid) {
        map[qid] = getRuleDescriptionText(rule);
      }
    }
    return map;
  }, [rubricData]);

  const submissions = useMemo<AdjustableSubmission[]>(() => data?.submissions ?? [], [data]);
  const studentIds = useMemo(() => submissions.map((s) => s.student_id).sort(natsort), [submissions]);
  const { decryptedIds, isDecrypting: isDecryptingIds } = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  const sortedIndex = studentIds.indexOf(encodedStudentId);
  const current = submissions.find((s) => s.student_id === encodedStudentId) ?? null;
  const prevId = sortedIndex > 0 ? studentIds[sortedIndex - 1] : null;
  const nextId = sortedIndex >= 0 && sortedIndex < studentIds.length - 1 ? studentIds[sortedIndex + 1] : null;

  const sortedResults = useMemo(() => {
    if (!current?.result_map) return [] as ResultWithQid[];
    return Object.entries(current.result_map)
      .map(([qid, r]) => ({ ...r, question_id: qid }))
      .sort((a, b) => natsort(a.question_id, b.question_id));
  }, [current]);

  // ── Edit state ──────────────────────────────────────────────────────────────

  const [editing, setEditing] = useState<EditState>({});
  const [openEdits, setOpenEdits] = useState<Record<string, boolean>>({});
  const [removeAdjustQid, setRemoveAdjustQid] = useState<string | null>(null);

  // ── Filters ─────────────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const allQids = useMemo(() => sortedResults.map((r) => r.question_id), [sortedResults]);
  const [selectedQids, setSelectedQids] = useState<Set<string> | null>(null);

  const visibleResults = useMemo(() => {
    let results = selectedQids === null
      ? sortedResults
      : sortedResults.filter((r) => selectedQids.has(r.question_id));

    if (statusFilter === 'passed') {
      results = results.filter((r) => r.graded && r.passed);
    } else if (statusFilter === 'failed') {
      results = results.filter((r) => r.graded && !r.passed);
    } else if (statusFilter === 'adjusted') {
      results = results.filter((r) => hasAdjustment(r));
    }

    return results;
  }, [sortedResults, selectedQids, statusFilter]);

  const toggleQid = (qid: string) => {
    setSelectedQids((prev) => {
      const base = prev ?? new Set(allQids);
      const next = new Set(base);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next.size === allQids.length ? null : next;
    });
  };

  const activeFilterCount = selectedQids === null ? 0 : allQids.length - selectedQids.size;

  // ── Filter counts for segmented control ─────────────────────────────────────

  const filterCounts = useMemo(() => {
    const base = selectedQids === null
      ? sortedResults
      : sortedResults.filter((r) => selectedQids.has(r.question_id));
    return {
      all: base.length,
      passed: base.filter((r) => r.graded && r.passed).length,
      failed: base.filter((r) => r.graded && !r.passed).length,
      adjusted: base.filter((r) => hasAdjustment(r)).length,
    };
  }, [sortedResults, selectedQids]);

  // ── Edit handlers ───────────────────────────────────────────────────────────

  const startEdit = useCallback((qid: string, res: AdjustableQuestionResult) => {
    setOpenEdits((prev) => ({ ...prev, [qid]: true }));
    setEditing((prev) => ({
      ...prev,
      [qid]: {
        points: res.adjusted_points ?? res.points ?? undefined,
        feedback: res.adjusted_feedback ?? res.feedback ?? undefined,
      },
    }));
  }, []);

  const cancelEdit = useCallback((qid: string) => {
    setOpenEdits((prev) => ({ ...prev, [qid]: false }));
    setEditing((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  }, []);

  const saveEdit = useCallback(async (qid: string) => {
    if (!current) return;
    const e = editing[qid];
    if (!e) return;
    try {
      await adjustMutation.mutateAsync({
        student_id: current.student_id,
        question_id: qid,
        adjusted_points: e.points ?? null,
        adjusted_feedback: e.feedback ?? null,
      });
      cancelEdit(qid);
      notifySuccess('Adjustment saved');
    } catch (err) {
      notifyError(err);
    }
  }, [current, editing, adjustMutation, cancelEdit]);

  const handleEditChange = useCallback((qid: string, patch: Partial<{ points?: number; feedback?: string }>) => {
    setEditing((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], ...patch },
    }));
  }, []);

  // ── Keyboard navigation ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft' && prevId) {
        e.preventDefault();
        void navigate(detailPath(prevId));
      } else if (e.key === 'ArrowRight' && nextId) {
        e.preventDefault();
        void navigate(detailPath(nextId));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prevId, nextId, navigate, detailPath]);

  useEffect(() => {
    setEditing({});
    setOpenEdits({});
  }, [encodedStudentId]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const gotoPrev = () => { if (prevId) void navigate(detailPath(prevId)); };
  const gotoNext = () => { if (nextId) void navigate(detailPath(nextId)); };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (isLoading) return <Center style={{ minHeight: '60vh' }}><Loader /></Center>;
  if (isError) return <Box p="lg"><Alert color="red">{getErrorMessage(error)}</Alert></Box>;
  if (!current) return <Box p="lg"><Alert color="yellow">Submission not found.</Alert></Box>;

  // ── Computed totals ─────────────────────────────────────────────────────────

  const originalTotalPoints = sortedResults.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const adjustedTotalPoints = sortedResults.reduce(
    (sum, r) => sum + effectivePoints(r), 0,
  );
  const totalMax = sortedResults.reduce((sum, r) => sum + (r.max_points ?? 0), 0);
  const adjustmentsCount = sortedResults.filter((r) => hasAdjustment(r)).length;

  const originalPct = totalMax > 0 ? (originalTotalPoints / totalMax) * 100 : 0;
  const adjustedPct = totalMax > 0 ? (adjustedTotalPoints / totalMax) * 100 : 0;
  const delta = adjustedTotalPoints - originalTotalPoints;

  // ── Title / actions ─────────────────────────────────────────────────────────

  const navTitle = (
    <Group gap="sm" align="center" wrap="nowrap">
      <Button
        variant="outline"
        size="sm"
        leftSection={<IconChevronLeft size={14} />}
        onClick={() => void navigate(backPath)}
        px="xs"
      >
        Students
      </Button>
      <Select
        searchable
        size="sm"
        w={220}
        aria-label="Navigate to student"
        placeholder="Select student"
        value={encodedStudentId}
        onChange={(v) => v && void navigate(detailPath(v))}
        data={studentIds.map((id) => ({
          value: id,
          label: decryptedIds[id] ?? id,
        }))}
      />
      {sortedIndex >= 0 && (
        <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          ({sortedIndex + 1} of {studentIds.length})
        </Text>
      )}
      {isDecryptingIds && (
        <Badge variant="light" color="gray" size="sm">Decrypting...</Badge>
      )}
    </Group>
  );

  const navActions = (
    <Group gap="xs">
      <Tooltip label="Previous student (←)" withArrow>
        <ActionIcon variant="outline" onClick={gotoPrev} disabled={!prevId} aria-label="Previous student">
          <IconChevronLeft size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Next student (→)" withArrow>
        <ActionIcon variant="outline" onClick={gotoNext} disabled={!nextId} aria-label="Next student">
          <IconChevronRight size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageShell title={navTitle} actions={navActions} updatedAt={data?.status?.updated_at}>
      <GradingStatusBanner assessmentId={assessmentId} />

      <Stack gap="md">
        {/* ── Summary ── */}
        <Box>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Paper withBorder p="md">
              <Text size="xs" c="dimmed" mb={4}>Total (Original)</Text>
              <Group gap="xs" align="baseline">
                <Text ff="monospace" fw={700} size="xl">{originalTotalPoints.toFixed(2)}</Text>
                <Text c="dimmed" size="sm">/ {totalMax}</Text>
              </Group>
              <Group gap="xs" mt={6} align="center">
                <Progress value={originalPct} w={120} size="sm" />
                <Text ff="monospace" size="xs">{originalPct.toFixed(1)}%</Text>
              </Group>
            </Paper>

            <Paper withBorder p="md">
              <Text size="xs" c="dimmed" mb={4}>Total (Adjusted)</Text>
              <Group gap="xs" align="baseline">
                <Text ff="monospace" fw={700} size="xl">{adjustedTotalPoints.toFixed(2)}</Text>
                <Text c="dimmed" size="sm">/ {totalMax}</Text>
              </Group>
              <Group gap="xs" mt={6} align="center">
                <Progress value={adjustedPct} w={120} size="sm" color="teal" />
                <Text ff="monospace" size="xs">{adjustedPct.toFixed(1)}%</Text>
                <Text ff="monospace" size="xs" c={delta >= 0 ? 'green' : 'red'}>
                  {`Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
                </Text>
              </Group>
            </Paper>

            <Paper withBorder p="md">
              <Text size="xs" c="dimmed" mb={4}>Adjustments</Text>
              <Text fw={700} size="xl">{adjustmentsCount}</Text>
            </Paper>
          </SimpleGrid>
        </Box>

        {/* ── Toolbar: status filter + question filter ── */}
        <Group justify="space-between" align="center" px={4}>
          <Group gap="sm" align="center">
            <SegmentedControl
              size="xs"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              data={[
                { label: `All (${filterCounts.all})`, value: 'all' },
                { label: `Passed (${filterCounts.passed})`, value: 'passed' },
                { label: `Failed (${filterCounts.failed})`, value: 'failed' },
                { label: `Adjusted (${filterCounts.adjusted})`, value: 'adjusted' },
              ]}
            />
            <Text size="sm" c="dimmed">
              {visibleResults.length} question{visibleResults.length !== 1 ? 's' : ''}
            </Text>
          </Group>

          <Popover opened={filterOpen} onClose={() => setFilterOpen(false)} position="bottom-end" withArrow>
            <Popover.Target>
              <Button
                variant="subtle"
                size="sm"
                leftSection={<IconFilter size={14} />}
                onClick={() => setFilterOpen((v) => !v)}
              >
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant="filled" color="yellow" size="xs" ml={4}>{activeFilterCount}</Badge>
                )}
              </Button>
            </Popover.Target>
            <Popover.Dropdown p="xs" w={224}>
              <Stack gap={4}>
                <Group gap={4}>
                  <Button size="xs" variant="subtle" flex={1} onClick={() => setSelectedQids(null)}>Show all</Button>
                  <Button size="xs" variant="subtle" flex={1} onClick={() => setSelectedQids(new Set())}>Hide all</Button>
                </Group>
                <Divider />
                {allQids.map((qid) => (
                  <Checkbox
                    key={qid}
                    size="xs"
                    checked={selectedQids === null || selectedQids.has(qid)}
                    onChange={() => toggleQid(qid)}
                    label={<Text ff="monospace" size="xs">{qid}</Text>}
                  />
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>

        {/* ── Question cards ── */}
        {visibleResults.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No questions match the current filters.
          </Text>
        ) : (
          <Stack gap="sm">
            {visibleResults.map((res) => {
              const qid = res.question_id;
              const qDef = questionMap[qid] as { description?: string | null } | undefined;
              return (
                <QuestionCard
                  key={qid}
                  res={res}
                  answerValue={current.answer_map?.[qid]}
                  questionDescription={qDef?.description ?? null}
                  ruleDescription={ruleDescriptionByQid[qid] ?? null}
                  isEditing={!!openEdits[qid]}
                  editValues={editing[qid]}
                  isSaving={adjustMutation.isPending}
                  onStartEdit={() => startEdit(qid, res)}
                  onCancelEdit={() => cancelEdit(qid)}
                  onSaveEdit={() => void saveEdit(qid)}
                  onEditChange={(patch) => handleEditChange(qid, patch)}
                  onRemoveAdjustment={() => setRemoveAdjustQid(qid)}
                />
              );
            })}
          </Stack>
        )}

        {/* ── Remove adjustment modal ── */}
        <Modal
          opened={!!removeAdjustQid}
          onClose={() => setRemoveAdjustQid(null)}
          title="Remove Adjustment"
        >
          <Text mb="md">This will revert the adjusted points and feedback for this question. Proceed?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRemoveAdjustQid(null)}>Cancel</Button>
            <Button
              color="red"
              loading={adjustMutation.isPending}
              onClick={() => {
                if (!current || !removeAdjustQid) return;
                adjustMutation.mutate(
                  {
                    student_id: current.student_id,
                    question_id: removeAdjustQid,
                    adjusted_points: null,
                    adjusted_feedback: null,
                  },
                  {
                    onSuccess: () => {
                      setRemoveAdjustQid(null);
                      notifySuccess('Adjustment removed');
                    },
                    onError: () => notifyErrorMessage('Remove failed'),
                  },
                );
              }}
            >
              Remove
            </Button>
          </Group>
        </Modal>
      </Stack>
    </PageShell>
  );
};

const SubmissionDetailPage: React.FC = () => {
  const { assessmentId, studentId } = useParams<{ assessmentId: string; studentId: string }>();
  if (!assessmentId || !studentId) {
    return <Alert color="red">Assessment ID or Student ID is missing.</Alert>;
  }
  return <SubmissionDetailInner assessmentId={assessmentId} encodedStudentId={studentId} />;
};

export default SubmissionDetailPage;