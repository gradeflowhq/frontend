
import { Alert, Button, Center, Group, Modal, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments } from '@tabler/icons-react';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useQuestionSet } from '@features/questions/hooks';
import { useRubric, useRubricCoverage, useDeleteRubric } from '@features/rubric/hooks';
import { MultiTargetRulesSection, RulesHeader, SingleTargetRulesSection } from '@features/rules/components';
import RubricImportModal from '@features/rules/components/RubricImportModal';
import RubricUploadModal from '@features/rules/components/RubricUploadModal';
import { getErrorMessages } from '@utils/error';

import type { RubricOutput, QuestionSetOutputQuestionMap } from '@api/models';

const RulesTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();

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

  const rubric: RubricOutput = rubricRes?.rubric ?? { rules: [] };

  const cov = coverageRes?.coverage;
  const coveredQuestionIds = React.useMemo(
    () => new Set<string>(cov?.covered_question_ids ?? []),
    [cov]
  );

  const [openRubricUpload, setOpenRubricUpload] = React.useState(false);
  const [openRubricImport, setOpenRubricImport] = React.useState(false);
  const [confirmDeleteRubric, setConfirmDeleteRubric] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const deleteRubric = useDeleteRubric(safeId);

  const hasRules = (rubric?.rules?.length ?? 0) > 0;

  const renderSkeleton = () => (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {[...Array(3)].map((_, i) => (
          <Paper key={i} withBorder p="md">
            <Skeleton height={12} width={96} mb={8} />
            <Skeleton height={24} width={80} />
          </Paper>
        ))}
      </SimpleGrid>
      <Paper withBorder p="md">
        <Stack gap="sm">
          {[...Array(4)].map((_, i) => (
            <SimpleGrid key={i} cols={4}>
              <Skeleton height={12} />
              <Skeleton height={12} />
              <Skeleton height={12} />
              <Skeleton height={12} />
            </SimpleGrid>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );

  if (!enabled) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }

  if (!loadingQS && (qsNotFound || !hasQuestions)) {
    return (
      <Stack gap="md">
        <RulesHeader
          onUpload={() => setOpenRubricUpload(true)}
          onImport={() => setOpenRubricImport(true)}
          onDelete={() => setConfirmDeleteRubric(true)}
          disableDelete={deleteRubric.isPending}
          hasRules={hasRules}
          searchQuery={searchQuery}
          onSearchChange={(v) => setSearchQuery(v)}
          disabled
        />

        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconAdjustments size={32} color="var(--mantine-color-dimmed)" />
            <Title order={5}>Rules are locked</Title>
            <Text c="dimmed" size="sm">Set up questions first to configure rules.</Text>
          </Stack>
        </Center>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <RulesHeader
        onUpload={() => setOpenRubricUpload(true)}
        onImport={() => setOpenRubricImport(true)}
        onDelete={() => setConfirmDeleteRubric(true)}
        disableDelete={deleteRubric.isPending}
        hasRules={hasRules}
        searchQuery={searchQuery}
        onSearchChange={(v) => setSearchQuery(v)}
      />

      {!loadingCoverage && !errorCoverage && cov && (
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Paper withBorder p="md">
            <Text size="xs" c="dimmed" mb={4}>Total Questions</Text>
            <Text fw={700} size="xl">{cov.total ?? 0}</Text>
          </Paper>
          <Paper withBorder p="md">
            <Text size="xs" c="dimmed" mb={4}>Covered</Text>
            <Text fw={700} size="xl">{cov.covered ?? 0}</Text>
          </Paper>
          <Paper withBorder p="md">
            <Text size="xs" c="dimmed" mb={4}>Coverage</Text>
            <Text fw={700} size="xl">{((cov.percentage ?? 0) * 100).toFixed(1)}%</Text>
          </Paper>
        </SimpleGrid>
      )}

      {(loadingQS || loadingRubric || loadingCoverage) && renderSkeleton()}
      {errorQS && !qsNotFound && (
        <Alert color="red">{getErrorMessages(qsError).join(' ')}</Alert>
      )}
      {errorRubric && (
        <Alert color="red">{getErrorMessages(rubricError).join(' ')}</Alert>
      )}
      {errorCoverage && (
        <Alert color="red">{getErrorMessages(coverageError).join(' ')}</Alert>
      )}

      {!loadingQS && !errorQS && !loadingRubric && !errorRubric && (
        <>
          <SingleTargetRulesSection
            rubric={rubric}
            questionIds={questionIds}
            questionTypesById={questionTypesById}
            assessmentId={safeId}
            questionMap={questionMap}
            coveredQuestionIds={coveredQuestionIds}
            searchQuery={searchQuery}
          />

          <MultiTargetRulesSection
            rubric={rubric}
            assessmentId={safeId}
            questionMap={questionMap}
            searchQuery={searchQuery}
          />
        </>
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
          <Alert color="red" mt="sm">{getErrorMessages(deleteRubric.error).join(' ')}</Alert>
        )}
      </Modal>
    </Stack>
  );
};

export default RulesTabPage;
