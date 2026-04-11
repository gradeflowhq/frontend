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
import MultiTargetRulesSection from '@features/rules/components/MultiTargetRulesSection';
import RulesToolbar from '@features/rules/components/RulesToolbar';
import SingleTargetRulesSection from '@features/rules/components/SingleTargetRulesSection';
import { getRuleTargetQids, isMultiTargetRule } from '@features/rules/schema';
import { getInvalidRuleReferences, synchronizeRules } from '@features/rules/synchronization';
import { useAutoResetState } from '@hooks/useAutoResetState';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';
import { notifyError, notifyErrorMessage, notifySuccess } from '@utils/notifications';

import type { AdjustableSubmission, RubricOutput, RubricOutputRulesItem, QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '@features/rules/types';

const getRulesStatusMessage = (isStale: boolean, invalidRuleCount: number): string => {
  const ruleCountLabel = invalidRuleCount === 1 ? '1 rule' : `${invalidRuleCount} rules`;
  const referenceVerb = invalidRuleCount === 1 ? 'references' : 'reference';
  const deletedQuestionLabel = invalidRuleCount === 1 ? 'a deleted question' : 'deleted questions';

  if (invalidRuleCount > 0 && isStale) {
    return `Rules may be out of date — questions changed and ${ruleCountLabel} still ${referenceVerb} ${deletedQuestionLabel}.`;
  }

  if (invalidRuleCount > 0) {
    return `Rules are out of sync with the current question set. ${ruleCountLabel} still ${referenceVerb} ${deletedQuestionLabel}.`;
  }

  return 'Rules may be out of date — questions have changed since the last rubric was configured.';
};

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

  const qsNotFound = (qsError as { response?: { status?: number } } | undefined)?.response?.status === 404;

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
  const [confirmSynchronizeRules, setConfirmSynchronizeRules] = React.useState(false);
  const [dismissedRulesSyncSignature, setDismissedRulesSyncSignature] = React.useState<string | null>(null);
  const [statusAction, setStatusAction] = React.useState<'dismiss' | 'sync' | null>(null);
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
      const ruleIdx = rule ? multiRules.indexOf(rule as unknown as RubricOutputRulesItem) : -1;
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

  const invalidRuleReferences = React.useMemo(
    () => getInvalidRuleReferences((rubric?.rules ?? []) as RuleValue[], questionIds),
    [rubric, questionIds],
  );
  const hasInvalidRules = invalidRuleReferences.length > 0;
  const isRubricStale = Boolean(rubricRes?.status?.is_stale);
  const rulesSyncSignature = React.useMemo(
    () => invalidRuleReferences.map((rule) => rule.summary).join('|'),
    [invalidRuleReferences],
  );
  const showRulesStatusBanner = isRubricStale || (
    hasInvalidRules && dismissedRulesSyncSignature !== rulesSyncSignature
  );

  // No-op save to acknowledge staleness and refresh updated_at
  const handleDismissStatus = React.useCallback(() => {
    if (hasInvalidRules) {
      setDismissedRulesSyncSignature(rulesSyncSignature);
    }

    if (!isRubricStale) {
      notifySuccess('Rules warning dismissed');
      return;
    }

    if (!rubric) return;

    setStatusAction('dismiss');
    replaceRubric.mutate(rubric.rules as RuleValue[], {
      onSuccess: () => {
        notifySuccess('Rules warning dismissed');
      },
      onError: () => {
        if (hasInvalidRules) {
          setDismissedRulesSyncSignature(null);
        }
        notifyErrorMessage('Could not dismiss warning');
      },
      onSettled: () => setStatusAction(null),
    });
  }, [hasInvalidRules, isRubricStale, replaceRubric, rubric, rulesSyncSignature]);

  const handleSynchronizeRules = React.useCallback(() => {
    const nextRules = synchronizeRules((rubric?.rules ?? []) as RuleValue[], invalidRuleReferences);
    setStatusAction('sync');
    replaceRubric.mutate(nextRules, {
      onSuccess: () => {
        setConfirmSynchronizeRules(false);
        setDismissedRulesSyncSignature(null);
        notifySuccess(
          invalidRuleReferences.length === 1
            ? `Removed invalid rule: ${invalidRuleReferences[0].summary}`
            : `Removed invalid rules: ${invalidRuleReferences.map((rule) => rule.summary).join('; ')}`,
        );
      },
      onError: (err) => {
        notifyError(err);
      },
      onSettled: () => setStatusAction(null),
    });
  }, [invalidRuleReferences, replaceRubric, rubric]);

  // Create an empty rubric explicitly when the user requests it
  const handleCreateEmptyRubric = React.useCallback(() => {
    replaceRubric.mutate([], {
      onSuccess: () =>
        notifySuccess('Empty rubric created'),
      onError: () =>
        notifyErrorMessage('Could not create rubric'),
    });
  }, [replaceRubric]);

  const hasRules = (rubric?.rules?.length ?? 0) > 0;
  const covTotal = cov?.total ?? 0;
  const covCovered = cov?.covered ?? 0;

  const rulesStatusActions = React.useMemo(() => {
    const actions = [];

    if (hasInvalidRules) {
      actions.push({
        label: 'Synchronize rules',
        onClick: () => setConfirmSynchronizeRules(true),
        color: 'orange',
        variant: 'light' as const,
        disabled: replaceRubric.isPending,
      });
    }

    if (isRubricStale) {
      actions.push({
        label: 'Dismiss',
        onClick: handleDismissStatus,
        loading: statusAction === 'dismiss' && replaceRubric.isPending,
        disabled: replaceRubric.isPending && statusAction !== 'dismiss',
      });
    } else if (hasInvalidRules) {
      actions.push({
        label: 'Dismiss',
        onClick: handleDismissStatus,
        disabled: replaceRubric.isPending,
      });
    }

    return actions;
  }, [handleDismissStatus, hasInvalidRules, isRubricStale, replaceRubric.isPending, statusAction]);

  const rulesStatusBanner = (
    <SectionStatusBadge
      isStale={rubricRes?.status?.is_stale}
      show={showRulesStatusBanner}
      staleMessage={getRulesStatusMessage(isRubricStale, invalidRuleReferences.length)}
      actions={rulesStatusActions}
    />
  );

  const synchronizeRulesModal = (
    <Modal
      opened={confirmSynchronizeRules}
      onClose={() => setConfirmSynchronizeRules(false)}
      title="Synchronize Rules"
      size="sm"
    >
      <Text mb="sm">
        This will delete the rules that still reference deleted questions.
      </Text>
      <Stack gap="xs" mb="md">
        {invalidRuleReferences.map((rule) => (
          <Text key={`${rule.ruleIndex}:${rule.summary}`} ff="monospace" size="sm">
            {rule.summary}
          </Text>
        ))}
      </Stack>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => setConfirmSynchronizeRules(false)}>
          Cancel
        </Button>
        <Button color="orange" loading={replaceRubric.isPending} onClick={handleSynchronizeRules}>
          Synchronize
        </Button>
      </Group>
    </Modal>
  );

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
        <Stack gap="md">
          {rulesStatusBanner}

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

        {synchronizeRulesModal}
        </Stack>
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

        {openRubricUpload && (
          <Suspense fallback={null}>
            <RubricUploadModal
              open={openRubricUpload}
              assessmentId={safeId}
              onClose={() => setOpenRubricUpload(false)}
            />
          </Suspense>
        )}
        {openRubricImport && (
          <Suspense fallback={null}>
            <RubricImportModal
              open={openRubricImport}
              assessmentId={safeId}
              onClose={() => setOpenRubricImport(false)}
            />
          </Suspense>
        )}
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
        {rulesStatusBanner}

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

        {openRubricUpload && (
          <Suspense fallback={null}>
            <RubricUploadModal
              open={openRubricUpload}
              assessmentId={safeId}
              onClose={() => setOpenRubricUpload(false)}
            />
          </Suspense>
        )}
        {openRubricImport && (
          <Suspense fallback={null}>
            <RubricImportModal
              open={openRubricImport}
              assessmentId={safeId}
              onClose={() => setOpenRubricImport(false)}
            />
          </Suspense>
        )}

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
                    notifySuccess('Rules deleted');
                  },
                  onError: () =>
                    notifyErrorMessage('Delete failed'),
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

        {synchronizeRulesModal}
      </Stack>
    </PageShell>
  );
};

export default RulesPage;