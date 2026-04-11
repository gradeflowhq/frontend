import { Alert, Skeleton, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconQuestionMark, IconSearch } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import EmptyState from '@components/common/EmptyState';
import MasterDetailLayout from '@components/common/MasterDetailLayout';
import PageShell from '@components/common/PageShell';
import QuestionMasterList from '@components/common/QuestionMasterList';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { useAdjustGrading, useBulkAdjustGrading, useGrading } from '@features/grading/api';
import {
  GradingStatusBanner,
  NoGradingResults,
} from '@features/grading/components';
import {
  AnswerGroupList,
  GroupModeSelector,
  QuestionGroupHeader,
} from '@features/grading/components/group-view';
import { buildGroups } from '@features/grading/helpers/grouping';
import {
  groupBySemantic,
  isEmbeddingModelReady,
} from '@features/grading/helpers/semanticGrouping';
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';
import { useQuestionSet } from '@features/questions/api';
import { buildQuestionTypesById } from '@features/questions/helpers';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useUrlSelectedId } from '@hooks/useUrlSelectedId';
import { isEncrypted } from '@utils/crypto';
import { getErrorMessage } from '@utils/error';
import { notifyError, notifyErrorMessage, notifySuccess } from '@utils/notifications';
import { natsort } from '@utils/sort';

import type { AdjustableSubmission, QuestionSetOutputQuestionMap } from '@api/models';
import type { BulkAdjustArgs } from '@features/grading/components/group-view';
import type { SemanticState } from '@features/grading/components/group-view/GroupModeSelector';
import type { AnswerGroup, ClusterOpts, GroupingMode, NormalizeOpts } from '@features/grading/helpers/grouping';
import type { RuleValue } from '@features/rules/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_NORMALIZE_OPTS: NormalizeOpts = {
  ignoreCase: true,
  ignoreWhitespace: true,
  ignorePunctuation: false,
};

// Exact-match threshold for normalized answer/feedback grouping.
const DEFAULT_TEXT_THRESHOLD = 1.0;
const DEFAULT_SEMANTIC_THRESHOLD = 0.85;
const AQ_PARAM = 'aq';

// ── Page component ────────────────────────────────────────────────────────────

const GroupViewPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();

  const [mode, setMode] = useState<GroupingMode>('answer');
  const [useSemanticGrouping, setUseSemanticGrouping] = useState(false);
  const [textThreshold, setTextThreshold] = useState(DEFAULT_TEXT_THRESHOLD);
  // pending thresholds are the slider values before the user clicks "Apply"
  const [pendingTextThreshold, setPendingTextThreshold] = useState(DEFAULT_TEXT_THRESHOLD);
  const [semanticThreshold, setSemanticThreshold] = useState(DEFAULT_SEMANTIC_THRESHOLD);
  const [pendingSemanticThreshold, setPendingSemanticThreshold] = useState(DEFAULT_SEMANTIC_THRESHOLD);
  const [normalizeOpts, setNormalizeOpts] = useState<NormalizeOpts>(DEFAULT_NORMALIZE_OPTS);
  const [bulkLoadingKey, setBulkLoadingKey] = useState<string | null>(null);
  const [individualLoadingId, setIndividualLoadingId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [groups, setGroups] = useState<AnswerGroup[]>([]);
  const [isGroupsPending, startGroupsTransition] = useTransition();
  const [semanticState, setSemanticState] = useState<SemanticState>('idle');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: gradingData, isLoading, isError, error } = useGrading(assessmentId, true);
  const { data: qsRes } = useQuestionSet(assessmentId, true);
  const adjustMutation = useAdjustGrading(assessmentId);
  const bulkAdjustMutation = useBulkAdjustGrading(assessmentId);
  const { updatedAt } = useGradingStatus(assessmentId);

  useDocumentTitle(`Groups - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  // ── Derived state ──────────────────────────────────────────────────────────

  const submissions = useMemo<AdjustableSubmission[]>(
    () => gradingData?.submissions ?? [],
    [gradingData],
  );

  // Trigger passphrase prompt when encrypted student IDs are detected
  useEffect(() => {
    if (submissions.some((s) => isEncrypted(s.student_id))) {
      notifyEncryptedDetected();
    }
  }, [submissions, notifyEncryptedDetected]);

  const questionMap = useMemo<QuestionSetOutputQuestionMap>(
    () => qsRes?.question_set?.question_map ?? {},
    [qsRes],
  );

  const questionIds = useMemo(() => Object.keys(questionMap).sort(natsort), [questionMap]);

  const questionTypesById = useMemo(() => buildQuestionTypesById(questionMap), [questionMap]);

  const { selectedId: selectedQid, setSelectedId: setSelectedQid } = useUrlSelectedId(questionIds, AQ_PARAM);

  const byQuestion = useMemo(() => {
    const map: Record<string, [unknown]> = {};
    for (const sub of submissions) {
      for (const qid of Object.keys(sub.result_map ?? {})) {
        if (!map[qid]) map[qid] = [{}];
      }
    }
    return map;
  }, [submissions]);

  const coveredQuestionIds = useMemo(() => new Set(Object.keys(byQuestion)), [byQuestion]);

  const threshold = useSemanticGrouping ? semanticThreshold : textThreshold;
  const pendingThreshold = useSemanticGrouping ? pendingSemanticThreshold : pendingTextThreshold;

  const clusterOpts = useMemo<ClusterOpts>(
    () => ({ threshold: textThreshold, normalizeOpts }),
    [textThreshold, normalizeOpts],
  );

  const handlePendingThresholdChange = useCallback(
    (value: number) => {
      if (useSemanticGrouping) {
        setPendingSemanticThreshold(value);
        return;
      }
      setPendingTextThreshold(value);
    },
    [useSemanticGrouping],
  );

  const handleApplyThreshold = useCallback(() => {
    if (useSemanticGrouping) {
      setSemanticThreshold(pendingSemanticThreshold);
      return;
    }
    setTextThreshold(pendingTextThreshold);
  }, [pendingSemanticThreshold, pendingTextThreshold, useSemanticGrouping]);

  // Compute groups lazily via useTransition so heavy cluster computation doesn't block the UI.
  // Skip recomputation while a bulk adjustment is in progress — the group key can change mid-loop
  // which would cause the loading indicator to flicker off prematurely.
  useEffect(() => {
    if (useSemanticGrouping) return;
    if (bulkLoadingKey !== null) return;
    startGroupsTransition(() => {
      setGroups(selectedQid ? buildGroups(submissions, selectedQid, mode, clusterOpts) : []);
    });
  }, [submissions, selectedQid, mode, clusterOpts, bulkLoadingKey, useSemanticGrouping]);

  useEffect(() => {
    if (!useSemanticGrouping) {
      setSemanticState('idle');
      return;
    }
    if (bulkLoadingKey !== null) return;
    if (!selectedQid) {
      setGroups([]);
      return;
    }

    let cancelled = false;

    const compute = async () => {
      setSemanticState(isEmbeddingModelReady() ? 'computing' : 'loading-model');
      try {
        const result = await groupBySemantic(submissions, selectedQid, semanticThreshold, mode);
        if (!cancelled) {
          setGroups(result);
          setSemanticState('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setSemanticState('idle');
          notifyErrorMessage(`Semantic grouping failed: ${getErrorMessage(err as Error)}`);
        }
      }
    };

    void compute();
    return () => { cancelled = true; };
  }, [submissions, selectedQid, mode, semanticThreshold, bulkLoadingKey, useSemanticGrouping]);

  const headerStats = useMemo(() => {
    if (!selectedQid) return null;
    const results = submissions.flatMap((s) => {
      const r = s.result_map?.[selectedQid];
      return r ? [r] : [];
    });
    return {
      totalStudents: results.length,
      passedCount: results.filter((r) => r.passed).length,
      maxPoints: results[0]?.max_points ?? 0,
      adjustmentCount: results.filter(
        (r) =>
          (r.adjusted_points !== null && r.adjusted_points !== undefined) ||
          (r.adjusted_feedback !== null && r.adjusted_feedback !== undefined),
      ).length,
    };
  }, [submissions, selectedQid]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (qid: string) => {
      setSelectedQid(qid);
      setMobileShowDetail(true);
    },
    [setSelectedQid],
  );

  const handleBulkAdjust = useCallback(
    async (group: AnswerGroup, { points, feedback, skipExisting }: BulkAdjustArgs) => {
      if (!selectedQid) return;
      const targets = skipExisting
        ? group.entries.filter((e) => !e.hasManualAdjustment)
        : group.entries;
      if (targets.length === 0) return;

      setBulkLoadingKey(group.key);
      try {
        const adjustments = targets.map((entry) => ({
          student_id: entry.studentId,
          question_id: selectedQid,
          adjusted_points:
            points !== null
              ? points
              : entry.effectivePoints !== entry.originalPoints
              ? entry.effectivePoints
              : null,
          adjusted_feedback:
            feedback !== null
              ? feedback
              : entry.effectiveFeedback !== entry.originalFeedback
              ? entry.effectiveFeedback
              : null,
        }));

        const result = await bulkAdjustMutation.mutateAsync({ adjustments });
        const errorCount = result.errors?.length ?? 0;
        const msg =
          errorCount > 0
            ? `Adjusted ${result.applied} students (${errorCount} failed)`
            : `Adjusted ${result.applied} students`;
        notifications.show({
          color: errorCount > 0 ? 'yellow' : 'green',
          message: msg,
        });
      } catch (err) {
        notifyError(err);
      } finally {
        setBulkLoadingKey(null);
      }
    },
    [selectedQid, bulkAdjustMutation],
  );

  const handleBulkRemove = useCallback(
    async (group: AnswerGroup) => {
      if (!selectedQid) return;
      if (group.entries.length === 0) return;

      setBulkLoadingKey(`remove-${group.key}`);
      try {
        const adjustments = group.entries.map((entry) => ({
          student_id: entry.studentId,
          question_id: selectedQid,
          adjusted_points: null,
          adjusted_feedback: null,
        }));
        const result = await bulkAdjustMutation.mutateAsync({ adjustments });
        const errorCount = result.errors?.length ?? 0;
        notifications.show({
          color: errorCount > 0 ? 'yellow' : 'green',
          message: errorCount > 0
            ? `Removed adjustments for ${result.applied} students (${errorCount} failed)`
            : `Removed adjustments for ${result.applied} students`,
        });
      } catch (err) {
        notifyError(err);
      } finally {
        setBulkLoadingKey(null);
      }
    },
    [selectedQid, bulkAdjustMutation],
  );

  const handleIndividualAdjust = useCallback(
    async (
      studentId: string,
      { points, feedback }: { points: number | null; feedback: string | null },
    ) => {
      if (!selectedQid) return;
      setIndividualLoadingId(studentId);
      try {
        await adjustMutation.mutateAsync({
          student_id: studentId,
          question_id: selectedQid,
          adjusted_points: points,
          adjusted_feedback: feedback,
        });
        notifySuccess('Adjustment saved');
      } catch (err) {
        notifyError(err);
      } finally {
        setIndividualLoadingId(null);
      }
    },
    [selectedQid, adjustMutation],
  );

  // ── Early returns ──────────────────────────────────────────────────────────

  if (!assessmentId) return <Alert color="red">Assessment ID is missing.</Alert>;

  if (isLoading) {
    return (
      <PageShell title="Groups">
        <Skeleton height={400} />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell title="Groups">
        <Alert color="red">{getErrorMessage(error)}</Alert>
      </PageShell>
    );
  }

  // ── No grading results yet ─────────────────────────────────────────────────

  if (submissions.length === 0) {
    return (
      <PageShell title="Groups">
        <GradingStatusBanner assessmentId={assessmentId} />
        <NoGradingResults assessmentId={assessmentId} />
      </PageShell>
    );
  }

  // ── No questions found ─────────────────────────────────────────────────────

  if (questionIds.length === 0) {
    return (
      <PageShell title="Groups">
        <EmptyState
          icon={<IconQuestionMark size={48} opacity={0.3} />}
          title="No questions found"
          description="Set up questions first to use the group view."
        />
      </PageShell>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const listPanel = (
    <QuestionMasterList
      questionIds={questionIds}
      questionTypesById={questionTypesById}
      byQuestion={byQuestion as Record<string, RuleValue[]>}
      coveredQuestionIds={coveredQuestionIds}
      coveringRuleByQid={{}}
      selectedQid={selectedQid}
      onSelect={handleSelect}
      searchQuery={searchQuery}
      gradingItems={submissions}
      totalStudents={submissions.length}
    />
  );

  const detailPanel = (
    <Stack gap="md">
      {selectedQid && headerStats && (
        <QuestionGroupHeader
          qid={selectedQid}
          questionType={questionTypesById[selectedQid] ?? 'TEXT'}
          {...headerStats}
        />
      )}

      <GroupModeSelector
        mode={mode}
        onChange={setMode}
        useSemanticGrouping={useSemanticGrouping}
        onUseSemanticGroupingChange={setUseSemanticGrouping}
        threshold={threshold}
        pendingThreshold={pendingThreshold}
        onPendingThresholdChange={handlePendingThresholdChange}
        onApplyThreshold={handleApplyThreshold}
        normalizeOpts={normalizeOpts}
        onNormalizeOptsChange={setNormalizeOpts}
        isGroupsPending={isGroupsPending}
        semanticState={semanticState}
      />

      {selectedQid && (
        <AnswerGroupList
          key={selectedQid}
          groups={groups}
          maxPoints={headerStats?.maxPoints ?? 0}
          onBulkAdjust={(group, args) => { void handleBulkAdjust(group, args); }}
          onBulkRemove={(group) => { void handleBulkRemove(group); }}
          onIndividualAdjust={handleIndividualAdjust}
          bulkLoadingKey={bulkLoadingKey}
          individualLoadingId={individualLoadingId}
          passphrase={passphrase}
          onEncryptedDetected={notifyEncryptedDetected}
        />
      )}
    </Stack>
  );

  return (
    <PageShell
      title="Groups"
      updatedAt={updatedAt}
      actions={
        <TextInput
          leftSection={<IconSearch size={14} />}
          aria-label="Search questions"
          placeholder="Search questions"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
          w={200}
        />
      }
    >
      <Stack gap={0}>
        <GradingStatusBanner assessmentId={assessmentId} />
        <MasterDetailLayout
          listPanel={listPanel}
          detailPanel={detailPanel}
          listWidth="180px"
          layoutHeight="calc(100dvh - 105px)"
          backLabel="Back to questions"
          mobileShowDetail={mobileShowDetail}
          onMobileShowDetailChange={setMobileShowDetail}
        />
      </Stack>
    </PageShell>
  );
};

export default GroupViewPage;
