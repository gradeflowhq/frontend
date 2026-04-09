import {
  Alert,
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  Modal,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAdjustments,
  IconFileImport,
  IconPlus,
  IconQuestionMark,
  IconUpload,
} from '@tabler/icons-react';
import React, { lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { ActionOptionCard } from '@components/common/ActionOptionCard';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { useGrading } from '@features/grading/api';
import { useQuestionSet } from '@features/questions/api';
import { useRubric, useRubricCoverage, useDeleteRubric } from '@features/rubric/api';
const RubricImportModal = lazy(
  () => import('@features/rubric/components/RubricImportModal'),
);
const RubricUploadModal = lazy(
  () => import('@features/rubric/components/RubricUploadModal'),
);
import { useReplaceRubric } from '@features/rules/api';
import {
  MultiTargetRulesSection,
  RulesToolbar,
  SingleTargetRulesSection,
} from '@features/rules/components';
import { getRuleTargetQids, isMultiTargetRule } from '@features/rules/schema';
import { useAutoResetState } from '@hooks/useAutoResetState';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import type { AdjustableSubmission, RubricOutput, QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '@features/rules/types';

const RulesPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  const [searchParams, setSearchParams] = useSearchParams();

  useDocumentTitle(`Rules - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const enabled = Boolean(assessmentId);
  const safeId = assessmentId;

  const {
    data: qsRes,
    isLoading: loadingQS,
    isError: errorQS,
    error: qsError,
  } = useQuestionSet(safeId, enabled);

  const qsNotFound = React.useMemo(() => {
    const err = qsError as { response?: { status?: number } } | undefined;
    return err?.response?.status === 404;
  }, [qsError]);

  const {
    data: rubricRes,
    isLoading: loadingRubric,
    isError: errorRubric,
    error: rubricError,
  } = useRubric(safeId);

  // rubricRes is null when the server returned 404 (no rubric created yet)
  const rubricMissing = rubricRes === null;

  const {
    data: coverageRes,
    isLoading: loadingCoverage,
    isError: errorCoverage,
    error: coverageError,
  } = useRubricCoverage(safeId);

  const questionMap: QuestionSetOutputQuestionMap = React.useMemo(() => {
    return qsNotFound ? {} : (qsRes?.question_set?.question_map ?? {});
  }, [qsNotFound, qsRes]);

  const hasQuestions = Object.keys(questionMap).length > 0;

  const questionIds = React.useMemo(
    () =>
      Object.keys(questionMap).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [questionMap],
  );

  const questionTypesById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const [qid, def] of Object.entries(questionMap)) {
      const typedDef = def as { type?: string } | undefined;
      m[qid] = typedDef?.type ?? 'TEXT';
    }
    return m;
  }, [questionMap]);

  const rubric: RubricOutput = React.useMemo(
    () => rubricRes?.rubric ?? { rules: [] },
    [rubricRes],
  );

  const { data: gradingData } = useGrading(safeId, enabled);

  const gradingItems = React.useMemo(
    () => (gradingData?.submissions ?? []) as AdjustableSubmission[],
    [gradingData],
  );
  const totalStudents = gradingItems.length;

  const cov = coverageRes?.coverage;
  const coveredQuestionIds = React.useMemo(
    () => new Set<string>(cov?.covered_question_ids ?? []),
    [cov],
  );

  const coveringRuleByQid = React.useMemo(() => {
    const map: Record<string, RuleValue> = {};
    for (const rule of rubric?.rules ?? []) {
      // Only global (multi-target) rules should appear as "covering" rules
      if (!isMultiTargetRule(rule)) continue;
      for (const qid of getRuleTargetQids(rule)) {
        if (!map[qid]) map[qid] = rule as RuleValue;
      }
    }
    return map;
  }, [rubric]);

  const [openRubricUpload, setOpenRubricUpload] = React.useState(false);
  const [openRubricImport, setOpenRubricImport] = React.useState(false);
  const [confirmDeleteRubric, setConfirmDeleteRubric] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Tab state — read from URL so deep-links and back/forward work correctly.
  const activeTab = (searchParams.get('tab') ?? 'questions') as 'questions' | 'global';

  const setActiveTab = React.useCallback(
    (tab: 'questions' | 'global') => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', tab);
          // Clean up the other tab's selection param to avoid stale state.
          if (tab === 'questions') next.delete('gr');
          if (tab === 'global') next.delete('q');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // highlightedRule is set when the user clicks "View global rule" from a
  // question's detail panel. Cleared after MultiTargetRulesSection consumes it.
  const [highlightedRule, setHighlightedRule] = useAutoResetState<RuleValue>(2000);

  const handleViewGlobalRule = React.useCallback(
    (qid: string) => {
      const rule = coveringRuleByQid[qid] ?? null;
      // Compute the rule's position among multi-target rules to avoid a
      // flash-to-rule-0 before MultiTargetRulesSection's highlightedRule effect fires.
      const multiRules = (rubric?.rules ?? []).filter(isMultiTargetRule);
      const ruleIdx = rule ? multiRules.indexOf(rule as RuleValue) : -1;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'global');
          next.delete('q');
          if (ruleIdx >= 0) next.set('gr', String(ruleIdx));
          return next;
        },
        { replace: true },
      );
      setHighlightedRule(rule);
    },
    [coveringRuleByQid, rubric, setSearchParams, setHighlightedRule],
  );

  const deleteRubric = useDeleteRubric(safeId);
  const replaceRubric = useReplaceRubric(safeId);

  // No-op save to acknowledge staleness and refresh updated_at
  const handleDismissStale = React.useCallback(() => {
    if (!rubric) return;
    replaceRubric.mutate(rubric.rules as RuleValue[], {
      onError: () =>
        notifications.show({ color: 'red', message: 'Could not acknowledge staleness' }),
    });
  }, [rubric, replaceRubric]);

  // Create an empty rubric explicitly when the user requests it
  const handleCreateEmptyRubric = React.useCallback(() => {
    replaceRubric.mutate([], {
      onSuccess: () =>
        notifications.show({ color: 'green', message: 'Empty rubric created' }),
      onError: () =>
        notifications.show({ color: 'red', message: 'Could not create rubric' }),
    });
  }, [replaceRubric]);

  const hasRules = (rubric?.rules?.length ?? 0) > 0;
  const covTotal = cov?.total ?? 0;
  const covCovered = cov?.covered ?? 0;

  const renderSkeleton = () => (
    <Stack gap="md">
      <Skeleton height={16} mb={4} />
      <Skeleton height={12} width="60%" />
    </Stack>
  );

  if (!enabled) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }

  // ── Locked: no questions configured yet ───────────────────────────────────

  if (!loadingQS && (qsNotFound || !hasQuestions)) {
    return (
      <PageShell
        title="Rules"
        actions={
          <RulesToolbar
            onUpload={() => setOpenRubricUpload(true)}
            onImport={() => setOpenRubricImport(true)}
            onDelete={() => setConfirmDeleteRubric(true)}
            disableDelete={deleteRubric.isPending}
            hasRules={hasRules}
            searchQuery={searchQuery}
            onSearchChange={(v) => setSearchQuery(v)}
            disabled
          />
        }
      >
        <Center py="xl">
          <Stack align="center" gap="md" maw={480} mx="auto">
            <IconAdjustments size={40} opacity={0.3} />

            <Title order={4} ta="center">Rules are locked</Title>

            <Text c="dimmed" size="sm" ta="center">
              Rules define how each question is graded. You need to configure your
              questions before you can set up grading rules.
            </Text>

            <Stack gap="xs" w="100%">
              <ActionOptionCard
                icon={<IconQuestionMark size={14} />}
                iconColor="blue"
                title="Set up questions first"
                description={<>Questions define the structure of your assessment — rules are built on top of them.{' '}<Anchor component={Link} to={`/assessments/${safeId}/questions`} size="xs">Go to Questions →</Anchor></>}
              />
            </Stack>
          </Stack>
        </Center>
      </PageShell>
    );
  }

  // ── No rubric yet: offer to create, upload, or import ─────────────────────

  if (!loadingRubric && !loadingQS && rubricMissing) {
    return (
      <PageShell
        title="Rules"
        actions={
          <RulesToolbar
            onUpload={() => setOpenRubricUpload(true)}
            onImport={() => setOpenRubricImport(true)}
            onDelete={() => setConfirmDeleteRubric(true)}
            disableDelete={deleteRubric.isPending}
            hasRules={false}
            searchQuery={searchQuery}
            onSearchChange={(v) => setSearchQuery(v)}
          />
        }
      >
        <Center py="xl">
          <Stack align="center" gap="md" maw={480} mx="auto">
            <IconAdjustments size={40} opacity={0.3} />

            <Title order={4} ta="center">No rubric configured yet</Title>

            <Text c="dimmed" size="sm" ta="center">
              A rubric contains the grading rules for your assessment. Choose how
              you would like to get started:
            </Text>

            <Stack gap="xs" w="100%">
              <ActionOptionCard
                icon={<IconPlus size={14} />}
                iconColor="blue"
                title="Start with an empty rubric"
                description={<>Create a blank rubric and define rules question by question.{' '}<Anchor component="button" size="xs" onClick={handleCreateEmptyRubric}>{replaceRubric.isPending ? 'Creating…' : 'Create now →'}</Anchor></>}
              />

              <ActionOptionCard
                icon={<IconUpload size={14} />}
                iconColor="teal"
                title="Upload a rubric file"
                description={<>Load a YAML or JSON rubric file you have already prepared.{' '}<Anchor component="button" size="xs" onClick={() => setOpenRubricUpload(true)}>Upload now →</Anchor></>}
              />

              <ActionOptionCard
                icon={<IconFileImport size={14} />}
                iconColor="violet"
                title="Import from another format"
                description={<>Import from a supported adapter format (e.g. Examplify).{' '}<Anchor component="button" size="xs" onClick={() => setOpenRubricImport(true)}>Import now →</Anchor></>}
              />
            </Stack>

            {replaceRubric.isError && (
              <Alert color="red" w="100%">
                {getErrorMessage(replaceRubric.error)}
              </Alert>
            )}
          </Stack>
        </Center>

        <Suspense fallback={null}>
          <RubricUploadModal
            open={openRubricUpload}
            assessmentId={safeId}
            onClose={() => setOpenRubricUpload(false)}
          />
        </Suspense>
        <Suspense fallback={null}>
          <RubricImportModal
            open={openRubricImport}
            assessmentId={safeId}
            onClose={() => setOpenRubricImport(false)}
          />
        </Suspense>
      </PageShell>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <PageShell
      title={
        <Group gap="sm" align="center">
          <Title order={3}>Rules</Title>
          {!loadingCoverage && !errorCoverage && covTotal > 0 && (
            <Badge variant="light" size="sm">
              {covCovered}/{covTotal}
            </Badge>
          )}
        </Group>
      }
      actions={
        <RulesToolbar
          onUpload={() => setOpenRubricUpload(true)}
          onImport={() => setOpenRubricImport(true)}
          onDelete={() => setConfirmDeleteRubric(true)}
          disableDelete={deleteRubric.isPending}
          hasRules={hasRules}
          searchQuery={searchQuery}
          onSearchChange={(v) => setSearchQuery(v)}
        />
      }
      updatedAt={rubricRes?.status?.updated_at}
    >
      <Stack gap="md">
        <SectionStatusBadge
          isStale={rubricRes?.status?.is_stale}
          staleMessage="Rules may be out of date — questions have changed since the last rubric was configured."
          onDismiss={rubricRes?.status?.is_stale ? handleDismissStale : undefined}
          isDismissing={replaceRubric.isPending}
        />

        {(loadingQS || loadingRubric || loadingCoverage) && renderSkeleton()}

        {errorQS && !qsNotFound && (
          <Alert color="red">{getErrorMessage(qsError)}</Alert>
        )}
        {errorRubric && (
          <Alert color="red">{getErrorMessage(rubricError)}</Alert>
        )}
        {errorCoverage && (
          <Alert color="red">{getErrorMessage(coverageError)}</Alert>
        )}

        {!loadingQS && !errorQS && !loadingRubric && !errorRubric && (
          <Tabs
            value={activeTab}
            onChange={(v) =>
              setActiveTab((v ?? 'questions') as 'questions' | 'global')
            }
          >
            <Tabs.List>
              <Tabs.Tab value="questions">Question Rules</Tabs.Tab>
              <Tabs.Tab value="global">Global Rules</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="questions" pt="md">
              <SingleTargetRulesSection
                rubric={rubric}
                questionIds={questionIds}
                questionTypesById={questionTypesById}
                assessmentId={safeId}
                questionMap={questionMap}
                coveredQuestionIds={coveredQuestionIds}
                searchQuery={searchQuery}
                coveringRuleByQid={coveringRuleByQid}
                onViewGlobalRule={handleViewGlobalRule}
                gradingItems={gradingItems}
                totalStudents={totalStudents}
              />
            </Tabs.Panel>

            <Tabs.Panel value="global" pt="md">
              <MultiTargetRulesSection
                rubric={rubric}
                assessmentId={safeId}
                questionMap={questionMap}
                searchQuery={searchQuery}
                highlightedRule={highlightedRule}
              />
            </Tabs.Panel>
          </Tabs>
        )}

        <Suspense fallback={null}>
          <RubricUploadModal
            open={openRubricUpload}
            assessmentId={safeId}
            onClose={() => setOpenRubricUpload(false)}
          />
        </Suspense>
        <Suspense fallback={null}>
          <RubricImportModal
            open={openRubricImport}
            assessmentId={safeId}
            onClose={() => setOpenRubricImport(false)}
          />
        </Suspense>

        <Modal
          opened={confirmDeleteRubric}
          onClose={() => setConfirmDeleteRubric(false)}
          title="Delete Rules"
        >
          <Text mb="md">This will remove all rules in the rubric. Continue?</Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setConfirmDeleteRubric(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteRubric.isPending}
              onClick={() =>
                deleteRubric.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmDeleteRubric(false);
                    notifications.show({ color: 'green', message: 'Rules deleted' });
                  },
                  onError: () =>
                    notifications.show({ color: 'red', message: 'Delete failed' }),
                })
              }
            >
              Delete
            </Button>
          </Group>
          {deleteRubric.isError && (
            <Alert color="red" mt="sm">
              {getErrorMessage(deleteRubric.error)}
            </Alert>
          )}
        </Modal>
      </Stack>
    </PageShell>
  );
};

export default RulesPage;