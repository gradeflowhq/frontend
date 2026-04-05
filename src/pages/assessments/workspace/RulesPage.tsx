
import { Alert, Badge, Button, Center, Group, Modal, Skeleton, Stack, Tabs, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments } from '@tabler/icons-react';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import { useQuestionSet } from '@features/questions/api';
import { useRubric, useRubricCoverage, useDeleteRubric } from '@features/rubric/api';
import { MultiTargetRulesSection, RulesToolbar, SingleTargetRulesSection } from '@features/rules/components';
import RubricImportModal from '@features/rules/components/RubricImportModal';
import RubricUploadModal from '@features/rules/components/RubricUploadModal';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import type { RubricOutput, QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '@features/rules/types';

const RulesPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { assessment } = useAssessmentContext();
  
  useDocumentTitle(`Rules - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const enabled = Boolean(assessmentId);
  const safeId = assessmentId ?? '';

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
    () => Object.keys(questionMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [questionMap]
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
    [rubricRes]
  );

  const cov = coverageRes?.coverage;
  const coveredQuestionIds = React.useMemo(
    () => new Set<string>(cov?.covered_question_ids ?? []),
    [cov]
  );

  // Map from question ID to the global rule that covers it
  const coveringRuleByQid = React.useMemo(() => {
    const map: Record<string, RuleValue> = {};
    for (const rule of (rubric?.rules ?? [])) {
      const qids = (rule as unknown as { question_ids?: string[] }).question_ids;
      if (Array.isArray(qids)) {
        for (const qid of qids) {
          if (!map[qid]) map[qid] = rule as RuleValue;
        }
      }
    }
    return map;
  }, [rubric]);

  const [openRubricUpload, setOpenRubricUpload] = React.useState(false);
  const [openRubricImport, setOpenRubricImport] = React.useState(false);
  const [confirmDeleteRubric, setConfirmDeleteRubric] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<string>('questions');
  const [highlightedRule, setHighlightedRule] = React.useState<RuleValue | null>(null);

  const covTotal = cov?.total ?? 0;
  const covCovered = cov?.covered ?? 0;

  // Clear highlight after 2s
  React.useEffect(() => {
    if (!highlightedRule) return;
    const timer = setTimeout(() => setHighlightedRule(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedRule]);

  const handleViewGlobalRule = (qid: string) => {
    const rule = coveringRuleByQid[qid] ?? null;
    setActiveTab('global');
    setHighlightedRule(rule);
  };

  const deleteRubric = useDeleteRubric(safeId);

  const hasRules = (rubric?.rules?.length ?? 0) > 0;

  const renderSkeleton = () => (
    <Stack gap="md">
      <Skeleton height={16} mb={4} />
      <Skeleton height={12} width="60%" />
    </Stack>
  );

  if (!enabled) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }

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
          <Stack align="center" gap="sm">
            <IconAdjustments size={32} color="var(--mantine-color-dimmed)" />
            <Title order={5}>Rules are locked</Title>
            <Text c="dimmed" size="sm">Set up questions first to configure rules.</Text>
          </Stack>
        </Center>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={
        <Group gap="sm" align="center">
          <Title order={3}>Rules</Title>
          {!loadingCoverage && !errorCoverage && covTotal > 0 && (
            <Badge variant="light" size="sm">{covCovered}/{covTotal}</Badge>
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
    >
    <Stack gap="md">

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
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? 'questions')}>
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

      {openRubricUpload && <RubricUploadModal
        open={openRubricUpload}
        assessmentId={safeId}
        onClose={() => setOpenRubricUpload(false)}
      />}
      {openRubricImport && <RubricImportModal
        open={openRubricImport}
        assessmentId={safeId}
        onClose={() => setOpenRubricImport(false)}
      />}

      <Modal
        opened={confirmDeleteRubric}
        onClose={() => setConfirmDeleteRubric(false)}
        title="Delete Rules"
      >
        <Text mb="md">This will remove all rules in the rubric. Continue?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmDeleteRubric(false)}>Cancel</Button>
          <Button
            color="red"
            loading={deleteRubric.isPending}
            onClick={() =>
              deleteRubric.mutate(undefined, {
                onSuccess: () => {
                  setConfirmDeleteRubric(false);
                  notifications.show({ color: 'green', message: 'Rules deleted' });
                },
                onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
              })
            }
          >
            Delete
          </Button>
        </Group>
        {deleteRubric.isError && (
          <Alert color="red" mt="sm">{getErrorMessage(deleteRubric.error)}</Alert>
        )}
      </Modal>
    </Stack>
    </PageShell>
  );
};

export default RulesPage;
