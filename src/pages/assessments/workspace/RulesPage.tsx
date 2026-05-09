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
import { UnsavedChangesModal } from '@components/common/UnsavedChangesModal';
import { useQuestionSet } from '@features/questions/api';
import { buildQuestionTypesById } from '@features/questions/helpers';
import {
  useAcknowledgeRubricStaleness,
  useCreateEmptyRubric,
  useDeleteRubric,
  useRubricOverview,
  useSyncRubric,
} from '@features/rubric/api';
import MultiTargetRulesSection from '@features/rules/components/MultiTargetRulesSection';
import RulesToolbar from '@features/rules/components/RulesToolbar';
import SingleTargetRulesSection from '@features/rules/components/SingleTargetRulesSection';
import { useAutoResetState } from '@hooks/useAutoResetState';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useUnsavedChangesGuard } from '@hooks/useUnsavedChangesGuard';
import { getErrorMessage, isNotFoundError } from '@utils/error';
import { notifyError, notifyErrorMessage, notifySuccess } from '@utils/notifications';

import type {
  QuestionSetOutputQuestionMap,
  RubricCoverage,
  StaleRuleReference,
} from '@api/models';
import type { RuleValue } from '@features/rules/types';

const RubricExportModal = lazy(
  () => import('@features/rubric/components/RubricExportModal'),
);
const RubricImportModal = lazy(
  () => import('@features/rubric/components/RubricImportModal'),
);
const RubricUploadModal = lazy(
  () => import('@features/rubric/components/RubricUploadModal'),
);

const getRulesStatusMessage = (isStale: boolean, staleRuleCount: number): string => {
  const ruleCountLabel = staleRuleCount === 1 ? '1 rule' : `${staleRuleCount} rules`;
  const referenceVerb = staleRuleCount === 1 ? 'references' : 'reference';
  const deletedQuestionLabel = staleRuleCount === 1 ? 'a deleted question' : 'deleted questions';

  if (staleRuleCount > 0 && isStale) {
    return `Rules may be out of date — questions changed and ${ruleCountLabel} still ${referenceVerb} ${deletedQuestionLabel}.`;
  }

  if (staleRuleCount > 0) {
    return `Rules are out of sync with the current question set. ${ruleCountLabel} still ${referenceVerb} ${deletedQuestionLabel}.`;
  }

  return 'Rules may be out of date — questions have changed since the last rubric was configured.';
};

const getStaleRuleSummary = (
  reference: StaleRuleReference,
  ruleById: Map<string, RuleValue>,
): string => {
  const label = ruleById.get(reference.rule_id)?.display_name ?? reference.rule_id;
  return `${reference.qids.join(', ')} -> ${label}`;
};

const RulesPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  const [searchParams, setSearchParams] = useSearchParams();

  useDocumentTitle(`Rules - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const enabled = Boolean(assessmentId);

  const {
    data: qsRes,
    isLoading: loadingQS,
    isError: errorQS,
    error: qsError,
  } = useQuestionSet(assessmentId, enabled);

  const qsNotFound = isNotFoundError(qsError);

  const questionMap: QuestionSetOutputQuestionMap = React.useMemo(() => {
    return qsNotFound ? {} : (qsRes?.question_set?.question_map ?? {});
  }, [qsNotFound, qsRes]);

  const hasQuestions = Object.keys(questionMap).length > 0;

  const {
    data: overview,
    isLoading: loadingOverview,
    isError: errorOverview,
    error: overviewError,
  } = useRubricOverview(assessmentId, enabled && hasQuestions);

  const rubricMissing = overview === null;

  const questionIds = React.useMemo(
    () =>
      Object.keys(questionMap).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [questionMap],
  );

  const questionTypesById = React.useMemo(() => buildQuestionTypesById(questionMap), [questionMap]);

  const questionRules = React.useMemo(
    () => (overview?.question_rules ?? []) as RuleValue[],
    [overview],
  );
  const globalRules = React.useMemo(
    () => (overview?.global_rules ?? []) as RuleValue[],
    [overview],
  );
  const rules = React.useMemo(
    () => [...questionRules, ...globalRules],
    [globalRules, questionRules],
  );

  const coverage: RubricCoverage | null = overview?.coverage ?? null;

  const ruleById = React.useMemo(
    () => new Map(rules.flatMap((rule) => (rule.id ? [[rule.id, rule]] : []))),
    [rules],
  );

  const [openRubricUpload, setOpenRubricUpload] = React.useState(false);
  const [openRubricImport, setOpenRubricImport] = React.useState(false);
  const [openRubricExport, setOpenRubricExport] = React.useState(false);
  const [confirmDeleteRubric, setConfirmDeleteRubric] = React.useState(false);
  const [confirmSynchronizeRules, setConfirmSynchronizeRules] = React.useState(false);
  const [statusAction, setStatusAction] = React.useState<'dismiss' | 'sync' | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // ── Editing guard ───────────────────────────────────────────────────────
  // Children report editing state; the guard lives HERE (page level) so that
  // useBlocker doesn't get stuck when Mantine Tabs unmount the active section.
  const [childEditing, setChildEditing] = React.useState(false);

  // Child sections register their reset function so the guard can clear their
  // internal editing state on discard.
  const childResetRef = React.useRef<(() => void) | null>(null);

  const registerChildReset = React.useCallback((fn: (() => void) | null) => {
    childResetRef.current = fn;
  }, []);

  const resetEditing = React.useCallback(() => {
    setChildEditing(false);
    childResetRef.current?.();
  }, []);

  const { guard, modalOpened: guardModalOpen, handleStay, handleDiscard } =
    useUnsavedChangesGuard(childEditing, resetEditing);

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
      guard(() => {
        const ruleId = coverage?.global_rules[qid];
        const rule = ruleId ? (ruleById.get(ruleId) ?? null) : null;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('tab', 'global');
            next.delete('q');
            if (rule?.id) next.set('gr', rule.id);
            return next;
          },
          { replace: true },
        );
        setHighlightedRule(rule);
      });
    },
    [coverage, guard, ruleById, setSearchParams, setHighlightedRule],
  );

  const deleteRubric = useDeleteRubric(assessmentId);
  const acknowledgeRubricStaleness = useAcknowledgeRubricStaleness(assessmentId);
  const createEmptyRubric = useCreateEmptyRubric(assessmentId);
  const syncRubric = useSyncRubric(assessmentId);

  const staleRuleSummaries = React.useMemo(
    () =>
      (overview?.stale_rules ?? []).map((reference) => ({
        ...reference,
        summary: getStaleRuleSummary(reference, ruleById),
      })),
    [overview?.stale_rules, ruleById],
  );
  const hasStaleRules = staleRuleSummaries.length > 0;
  const isRubricStale = Boolean(overview?.status?.is_stale);
  const showRulesStatusBanner = isRubricStale || hasStaleRules;

  // Acknowledge staleness by refreshing the stored rubric timestamp.
  const handleDismissStatus = React.useCallback(() => {
    if (!isRubricStale) {
      return;
    }

    setStatusAction('dismiss');
    acknowledgeRubricStaleness.mutate(undefined, {
      onSuccess: () => {
        notifySuccess('Rules warning dismissed');
      },
      onError: () => {
        notifyErrorMessage('Could not dismiss warning');
      },
      onSettled: () => setStatusAction(null),
    });
  }, [acknowledgeRubricStaleness, isRubricStale]);

  const handleSynchronizeRules = React.useCallback(() => {
    setStatusAction('sync');
    syncRubric.mutate(undefined, {
      onSuccess: () => {
        setConfirmSynchronizeRules(false);
        notifySuccess(
          staleRuleSummaries.length === 1
            ? `Removed stale rule: ${staleRuleSummaries[0].summary}`
            : `Removed stale rules: ${staleRuleSummaries.map((rule) => rule.summary).join('; ')}`,
        );
      },
      onError: (err) => {
        notifyError(err);
      },
      onSettled: () => setStatusAction(null),
    });
  }, [staleRuleSummaries, syncRubric]);

  // Create an empty rubric explicitly when the user requests it
  const handleCreateEmptyRubric = React.useCallback(() => {
    createEmptyRubric.mutate(undefined, {
      onSuccess: () =>
        notifySuccess('Empty rubric created'),
      onError: () =>
        notifyErrorMessage('Could not create rubric'),
    });
  }, [createEmptyRubric]);

  const hasRules = rules.length > 0;

  const rulesStatusActions = React.useMemo(() => {
    const actions = [];

    if (hasStaleRules) {
      actions.push({
        label: 'Synchronize rules',
        onClick: () => setConfirmSynchronizeRules(true),
        color: 'orange',
        variant: 'light' as const,
        loading: statusAction === 'sync' && syncRubric.isPending,
        disabled: syncRubric.isPending && statusAction !== 'sync',
      });
    }

    if (isRubricStale) {
      actions.push({
        label: 'Dismiss',
        onClick: handleDismissStatus,
        loading: statusAction === 'dismiss' && acknowledgeRubricStaleness.isPending,
        disabled: acknowledgeRubricStaleness.isPending && statusAction !== 'dismiss',
      });
    }

    return actions;
  }, [acknowledgeRubricStaleness.isPending, handleDismissStatus, hasStaleRules, isRubricStale, statusAction, syncRubric.isPending]);

  const rulesStatusBanner = (
    <SectionStatusBadge
      isStale={overview?.status?.is_stale}
      show={showRulesStatusBanner}
      staleMessage={getRulesStatusMessage(isRubricStale, staleRuleSummaries.length)}
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
        {staleRuleSummaries.map((rule) => (
          <Text key={`${rule.rule_id}:${rule.summary}`} ff="monospace" size="sm">
            {rule.summary}
          </Text>
        ))}
      </Stack>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => setConfirmSynchronizeRules(false)}>
          Cancel
        </Button>
        <Button color="orange" loading={syncRubric.isPending} onClick={handleSynchronizeRules}>
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
            onExport={overview ? () => setOpenRubricExport(true) : undefined}
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
                  description={<>Questions define the structure of your assessment — rules are built on top of them.{' '}<Anchor component={Link} to={`/assessments/${assessmentId}/questions`} size="xs">Go to Questions →</Anchor></>}
                />
              </Stack>
            </Stack>
          </Center>

          {synchronizeRulesModal}
          {openRubricExport && (
            <Suspense fallback={null}>
              <RubricExportModal
                open={openRubricExport}
                assessmentId={assessmentId}
                onClose={() => setOpenRubricExport(false)}
              />
            </Suspense>
          )}
        </Stack>
      </PageShell>
    );
  }

  // ── No rubric yet: offer to create, upload, or import ─────────────────────

  if (!loadingOverview && !loadingQS && rubricMissing) {
    return (
      <PageShell
        title="Rules"
        actions={
          <RulesToolbar
            onUpload={() => setOpenRubricUpload(true)}
            onImport={() => setOpenRubricImport(true)}
            onExport={undefined}
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
                description={<>Create a blank rubric and define rules question by question.{' '}<Anchor component="button" size="xs" onClick={handleCreateEmptyRubric}>{createEmptyRubric.isPending ? 'Creating…' : 'Create now →'}</Anchor></>}
              />

              <ActionOptionCard
                icon={<IconUpload size={14} />}
                iconColor="teal"
                title="Upload a rubric file"
                description={<>Load a YAML rubric file you have already prepared.{' '}<Anchor component="button" size="xs" onClick={() => setOpenRubricUpload(true)}>Upload now →</Anchor></>}
              />

              <ActionOptionCard
                icon={<IconFileImport size={14} />}
                iconColor="violet"
                title="Import from another format"
                description={<>Import from a supported adapter format (e.g. Examplify).{' '}<Anchor component="button" size="xs" onClick={() => setOpenRubricImport(true)}>Import now →</Anchor></>}
              />
            </Stack>

            {createEmptyRubric.isError && (
              <Alert color="red" w="100%">
                {getErrorMessage(createEmptyRubric.error)}
              </Alert>
            )}
          </Stack>
        </Center>

        {openRubricUpload && (
          <Suspense fallback={null}>
            <RubricUploadModal
              open={openRubricUpload}
              assessmentId={assessmentId}
              onClose={() => setOpenRubricUpload(false)}
            />
          </Suspense>
        )}
        {openRubricImport && (
          <Suspense fallback={null}>
            <RubricImportModal
              open={openRubricImport}
              assessmentId={assessmentId}
              onClose={() => setOpenRubricImport(false)}
            />
          </Suspense>
        )}
        {openRubricExport && (
          <Suspense fallback={null}>
            <RubricExportModal
              open={openRubricExport}
              assessmentId={assessmentId}
              onClose={() => setOpenRubricExport(false)}
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
          {(overview?.coverage.total ?? 0) > 0 && (
            <Badge variant="light" size="sm">
              {overview?.coverage.covered ?? 0}/{overview?.coverage.total ?? 0}
            </Badge>
          )}
        </Group>
      }
      actions={
        <RulesToolbar
          onUpload={() => setOpenRubricUpload(true)}
          onImport={() => setOpenRubricImport(true)}
          onExport={overview ? () => setOpenRubricExport(true) : undefined}
          onDelete={() => setConfirmDeleteRubric(true)}
          disableDelete={deleteRubric.isPending}
          hasRules={hasRules}
          searchQuery={searchQuery}
          onSearchChange={(v) => setSearchQuery(v)}
        />
      }
      updatedAt={overview?.status?.updated_at}
    >
      <Stack gap="md">
        {rulesStatusBanner}

        {(loadingQS || loadingOverview) && renderSkeleton()}

        {errorQS && !qsNotFound && (
          <Alert color="red">{getErrorMessage(qsError)}</Alert>
        )}
        {errorOverview && (
          <Alert color="red">{getErrorMessage(overviewError)}</Alert>
        )}

        {!loadingQS && !errorQS && !loadingOverview && !errorOverview && (
          <Tabs
            value={activeTab}
            onChange={(v) =>
              guard(() =>
                setActiveTab((v ?? 'questions') as 'questions' | 'global'),
              )
            }
          >
            <Tabs.List>
              <Tabs.Tab value="questions">Question Rules</Tabs.Tab>
              <Tabs.Tab value="global">Global Rules</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="questions" pt="md">
              <SingleTargetRulesSection
                questionRules={questionRules}
                globalRules={globalRules}
                coverage={coverage}
                questionIds={questionIds}
                questionTypesById={questionTypesById}
                assessmentId={assessmentId}
                questionMap={questionMap}
                searchQuery={searchQuery}
                onViewGlobalRule={handleViewGlobalRule}
                guard={guard}
                onEditStateChange={setChildEditing}
                registerResetEditing={registerChildReset}
              />
            </Tabs.Panel>

            <Tabs.Panel value="global" pt="md">
              <MultiTargetRulesSection
                globalRules={globalRules}
                coverage={coverage}
                assessmentId={assessmentId}
                searchQuery={searchQuery}
                highlightedRule={highlightedRule}
                guard={guard}
                onEditStateChange={setChildEditing}
                registerResetEditing={registerChildReset}
              />
            </Tabs.Panel>
          </Tabs>
        )}

        {openRubricUpload && (
          <Suspense fallback={null}>
            <RubricUploadModal
              open={openRubricUpload}
              assessmentId={assessmentId}
              onClose={() => setOpenRubricUpload(false)}
            />
          </Suspense>
        )}
        {openRubricImport && (
          <Suspense fallback={null}>
            <RubricImportModal
              open={openRubricImport}
              assessmentId={assessmentId}
              onClose={() => setOpenRubricImport(false)}
            />
          </Suspense>
        )}
        {openRubricExport && (
          <Suspense fallback={null}>
            <RubricExportModal
              open={openRubricExport}
              assessmentId={assessmentId}
              onClose={() => setOpenRubricExport(false)}
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

        <UnsavedChangesModal
          opened={guardModalOpen}
          message="You have unsaved changes. Continuing will discard them."
          onStay={handleStay}
          onDiscard={handleDiscard}
        />
      </Stack>
    </PageShell>
  );
};

export default RulesPage;
