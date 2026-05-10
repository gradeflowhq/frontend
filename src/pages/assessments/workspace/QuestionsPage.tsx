import {
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Modal,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconBolt,
  IconFileImport,
  IconInbox,
  IconPlus,
  IconQuestionMark,
  IconUpload,
} from '@tabler/icons-react';
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { ActionOptionCard } from '@components/common/ActionOptionCard';
import ErrorAlert from '@components/common/ErrorAlert';
import MasterDetailLayout from '@components/common/MasterDetailLayout';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { UnsavedChangesModal } from '@components/common/UnsavedChangesModal';
import {
  useAcknowledgeQuestionSetStaleness,
  useCreateQuestion,
  useDeleteQuestion,
  useDeleteQuestionSet,
  useInferAndParseQuestionSet,
  useParsedSubmissions,
  useQuestionSet,
  useQuestionSetStatus,
  useSyncQuestionSet,
  useUpdateQuestion,
  useUpdateQuestionSet,
} from '@features/questions/api';
import { QuestionsHeader } from '@features/questions/components';
import AddQuestionModal from '@features/questions/components/AddQuestionModal';
import QuestionEditorPanel from '@features/questions/components/QuestionEditorPanel';
import QuestionListPanel from '@features/questions/components/QuestionListPanel';
const QuestionSetExportModal = lazy(
  () => import('@features/questions/components/QuestionSetExportModal'),
);
const QuestionSetImportModal = lazy(
  () => import('@features/questions/components/QuestionSetImportModal'),
);
const QuestionSetUploadModal = lazy(
  () => import('@features/questions/components/QuestionSetUploadModal'),
);
import {
  buildExamplesFromParsed,
  buildQuestionTypesById,
  getQuestionIdsSorted,
} from '@features/questions/helpers';
import { useSubmissions } from '@features/submissions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useUnsavedChangesGuard } from '@hooks/useUnsavedChangesGuard';
import { useUrlSelectedId } from '@hooks/useUrlSelectedId';
import { isNotFoundError } from '@utils/error';
import { notifyError, notifyErrorMessage, notifySuccess } from '@utils/notifications';

import type { ChoiceOptionDrift, QuestionSetInput } from '@api/models';
import type { QuestionDef } from '@features/questions/components/QuestionEditorPanel';

const getQuestionStatusMessage = (
  isStale: boolean,
  missingQuestionCount: number,
  extraQuestionCount: number,
  choiceOptionDriftCount: number,
): string => {
  const outOfSyncQuestionCount = missingQuestionCount + extraQuestionCount + choiceOptionDriftCount;

  if (outOfSyncQuestionCount > 0) {
    const parts = [];

    if (missingQuestionCount > 0) {
      parts.push(
        `${missingQuestionCount} new question ID${missingQuestionCount === 1 ? '' : 's'}`,
      );
    }

    if (extraQuestionCount > 0) {
      parts.push(
        `${extraQuestionCount} extra question ID${extraQuestionCount === 1 ? '' : 's'}`,
      );
    }

    if (choiceOptionDriftCount > 0) {
      parts.push(
        `${choiceOptionDriftCount} choice option update${choiceOptionDriftCount === 1 ? '' : 's'}`,
      );
    }

    const summary = parts.join(' and ');
    const verb = outOfSyncQuestionCount === 1 ? 'was' : 'were';
    return isStale
      ? `Questions may be out of date — submissions changed and ${summary} ${verb} found.`
      : `Questions are out of sync with the current submissions. ${summary} ${verb} found.`;
  }

  return 'Questions may be out of date — submissions have been updated since the last question set was configured.';
};

const getChoiceOptionDriftSummary = (drift: ChoiceOptionDrift): string => {
  const missingOptions = drift.missing_options ?? [];
  return `${drift.question_id}: add ${missingOptions.join(', ')}`;
};

const QuestionsPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  useDocumentTitle(`Questions - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const enabled = Boolean(assessmentId);

  const [confirmInfer, setConfirmInfer] = useState(false);
  const [confirmDeleteQs, setConfirmDeleteQs] = useState(false);
  const [openQsUpload, setOpenQsUpload] = useState(false);
  const [openQsImport, setOpenQsImport] = useState(false);
  const [openQsExport, setOpenQsExport] = useState(false);
  const [openAddQuestion, setOpenAddQuestion] = useState(false);
  const [confirmDeleteQid, setConfirmDeleteQid] = useState<string | null>(null);
  const [confirmSynchronizeQuestions, setConfirmSynchronizeQuestions] = useState(false);
  const [dismissedQuestionSyncSignature, setDismissedQuestionSyncSignature] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<'dismiss' | 'sync' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [detailEditing, setDetailEditing] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const resetEditing = useCallback(() => {
    setDetailEditing(false);
  }, []);

  // Unified unsaved-changes guard (route + in-page + browser)
  const { guard, modalOpened: unsavedModalOpen, handleStay, handleDiscard } =
    useUnsavedChangesGuard(detailEditing, resetEditing);

  const {
    data: subsRes,
    isLoading: loadingSubmissions,
  } = useSubmissions(assessmentId);
  const hasSubmissions = (subsRes?.raw_submissions?.length ?? 0) > 0;

  // Question set
  const {
    data: qsRes,
    isLoading: loadingQS,
    isError: errorQS,
    error: qsError,
  } = useQuestionSet(assessmentId, enabled);

  const {
    data: statusRes,
    isLoading: loadingQuestionSetStatus,
    isError: errorQuestionSetStatus,
    error: questionSetStatusError,
  } = useQuestionSetStatus(assessmentId, enabled && hasSubmissions);

  const qsMissing = useMemo(() => isNotFoundError(qsError), [qsError]);
  const questionSetDrift = statusRes?.drift;

  const baseQuestionMap = useMemo(
    () => (qsMissing ? {} : (qsRes?.question_set?.question_map ?? {})),
    [qsMissing, qsRes],
  );
  const questionMap = baseQuestionMap;

  // "record exists" = API has a QS object (even with 0 questions)
  const hasQuestionSetRecord = !qsMissing && !!qsRes?.question_set;
  // "has questions" = at least one question configured
  const hasQuestions = hasQuestionSetRecord && Object.keys(questionMap).length > 0;

  const questionIds = useMemo(() => getQuestionIdsSorted(questionMap), [questionMap]);

  const missingQuestionIds = useMemo(
    () => questionSetDrift?.missing_question_ids ?? [],
    [questionSetDrift?.missing_question_ids],
  );
  const extraQuestionIds = useMemo(
    () => questionSetDrift?.extra_question_ids ?? [],
    [questionSetDrift?.extra_question_ids],
  );
  const choiceOptionDrifts = useMemo(
    () => questionSetDrift?.choice_option_drifts ?? [],
    [questionSetDrift?.choice_option_drifts],
  );
  const { selectedId: selectedQid, setSelectedId: setSelectedQid } = useUrlSelectedId(questionIds, 'q');

  const questionTypesById = useMemo(() => buildQuestionTypesById(questionMap), [questionMap]);

  // Parsed submissions (examples)
  const {
    data: parsedRes,
    isLoading: loadingParsed,
    isError: errorParsed,
    error: parsedError,
  } = useParsedSubmissions(assessmentId, hasQuestionSetRecord && enabled);

  const missingSubmissions = errorParsed && isNotFoundError(parsedError);

  const updateMutation = useUpdateQuestionSet(assessmentId);
  const createQuestionMutation = useCreateQuestion(assessmentId);
  const updateQuestionMutation = useUpdateQuestion(assessmentId);
  const deleteQuestionMutation = useDeleteQuestion(assessmentId);

  // Delete question set
  const deleteMutation = useDeleteQuestionSet(assessmentId);

  // Infer (replace) questions from submissions, then parse
  const inferMutation = useInferAndParseQuestionSet(assessmentId);
  const syncQuestionSetMutation = useSyncQuestionSet(assessmentId);
  const acknowledgeQuestionSetStalenessMutation = useAcknowledgeQuestionSetStaleness(assessmentId);

  // Examples from parsed submissions
  const examplesByQuestion = useMemo(
    () => buildExamplesFromParsed(parsedRes),
    [parsedRes],
  );

  const hasQuestionSetDrift = Boolean(questionSetDrift?.has_drift);
  const isQuestionSetStale = Boolean(statusRes?.status?.is_stale ?? qsRes?.status?.is_stale);
  const isQuestionActionPending =
    updateMutation.isPending ||
    createQuestionMutation.isPending ||
    updateQuestionMutation.isPending ||
    deleteQuestionMutation.isPending ||
    acknowledgeQuestionSetStalenessMutation.isPending ||
    syncQuestionSetMutation.isPending;
  const questionSyncSignature = useMemo(
    () => JSON.stringify({
      choice_options: choiceOptionDrifts,
      extra: extraQuestionIds,
      missing: missingQuestionIds,
    }),
    [choiceOptionDrifts, extraQuestionIds, missingQuestionIds],
  );
  const showQuestionStatusBadge = isQuestionSetStale || (
    hasQuestionSetDrift && dismissedQuestionSyncSignature !== questionSyncSignature
  );

  const handleDismissStatus = useCallback(() => {
    if (hasQuestionSetDrift) {
      setDismissedQuestionSyncSignature(questionSyncSignature);
    }

    if (!isQuestionSetStale) {
      notifySuccess('Question warning dismissed');
      return;
    }

    if (!hasQuestionSetRecord) return;

    setStatusAction('dismiss');
    acknowledgeQuestionSetStalenessMutation.mutate(undefined, {
      onSuccess: () => {
        notifySuccess('Question warning dismissed');
      },
      onError: () => {
        if (hasQuestionSetDrift) {
          setDismissedQuestionSyncSignature(null);
        }
        notifyErrorMessage('Could not dismiss warning');
      },
      onSettled: () => setStatusAction(null),
    });
  }, [
    acknowledgeQuestionSetStalenessMutation,
    hasQuestionSetDrift,
    hasQuestionSetRecord,
    isQuestionSetStale,
    questionSyncSignature,
  ]);

  const handleSynchronizeQuestions = useCallback(async () => {
    setStatusAction('sync');

    try {
      const syncedQuestionSet = await syncQuestionSetMutation.mutateAsync();
      const nextQuestionMap = syncedQuestionSet.question_set.question_map;

      const remainingIds = getQuestionIdsSorted(nextQuestionMap);
      if (selectedQid && extraQuestionIds.includes(selectedQid)) {
        setSelectedQid(remainingIds[0] ?? null);
        setMobileShowDetail(remainingIds.length > 0);
      }

      setConfirmSynchronizeQuestions(false);

      const changes = [];
      if (missingQuestionIds.length > 0) {
        changes.push(
          missingQuestionIds.length === 1
            ? `Added question: ${missingQuestionIds[0]}`
            : `Added questions: ${missingQuestionIds.join(', ')}`,
        );
      }
      if (extraQuestionIds.length > 0) {
        changes.push(
          extraQuestionIds.length === 1
            ? `Removed question: ${extraQuestionIds[0]}`
            : `Removed questions: ${extraQuestionIds.join(', ')}`,
        );
      }
      if (choiceOptionDrifts.length > 0) {
        changes.push(
          choiceOptionDrifts.length === 1
            ? `Updated choice options: ${getChoiceOptionDriftSummary(choiceOptionDrifts[0])}`
            : `Updated choice options: ${choiceOptionDrifts.map(getChoiceOptionDriftSummary).join('; ')}`,
        );
      }

      notifySuccess(changes.join('; ') || 'Questions synchronized');
      setDismissedQuestionSyncSignature(null);
    } catch (err) {
      notifyError(err);
    } finally {
      setStatusAction(null);
    }
  }, [
    choiceOptionDrifts,
    extraQuestionIds,
    missingQuestionIds,
    selectedQid,
    setSelectedQid,
    syncQuestionSetMutation,
  ]);

  const questionStatusActions = useMemo(() => {
    const actions = [];

    if (hasQuestionSetDrift) {
      actions.push({
        label: 'Synchronize questions',
        onClick: () => setConfirmSynchronizeQuestions(true),
        color: 'orange',
        variant: 'light' as const,
        loading: statusAction === 'sync' && syncQuestionSetMutation.isPending,
        disabled: isQuestionActionPending,
      });
    }

    if (isQuestionSetStale) {
      actions.push({
        label: 'Dismiss',
        onClick: handleDismissStatus,
        loading: statusAction === 'dismiss' && isQuestionActionPending,
        disabled: isQuestionActionPending && statusAction !== 'dismiss',
      });
    } else if (hasQuestionSetDrift) {
      actions.push({
        label: 'Dismiss',
        onClick: handleDismissStatus,
        disabled: isQuestionActionPending,
      });
    }

    return actions;
  }, [
    handleDismissStatus,
    hasQuestionSetDrift,
    isQuestionActionPending,
    isQuestionSetStale,
    statusAction,
    syncQuestionSetMutation.isPending,
  ]);

  // Question selection — guards against navigating away with unsaved edits.
  const handleSelect = useCallback(
    (qid: string): void => {
      guard(() => {
        setSelectedQid(qid);
        setMobileShowDetail(true);
      });
    },
    [guard, setSelectedQid],
  );

  const handleOpenAddQuestion = useCallback(() => {
    createQuestionMutation.reset();
    setOpenAddQuestion(true);
  }, [createQuestionMutation]);

  const handleCloseAddQuestion = useCallback(() => {
    createQuestionMutation.reset();
    setOpenAddQuestion(false);
  }, [createQuestionMutation]);

  const handleCreateEmptyQuestionSet = useCallback(() => {
    updateMutation.mutate(
      { question_map: {} as QuestionSetInput['question_map'] },
      {
        onSuccess: () => notifySuccess('Empty question set created'),
        onError: () => notifyErrorMessage('Could not create question set'),
      },
    );
  }, [updateMutation]);

  // Save handler called by QuestionEditorPanel.
  const handleSave = useCallback(
    async (updated: QuestionDef) => {
      if (!selectedQid) return;
      await updateQuestionMutation.mutateAsync(
        {
          questionId: selectedQid,
          question: updated,
        },
        {
          onSuccess: () => notifySuccess('Question saved'),
          onError: (err) => notifyError(err),
        },
      );
    },
    [selectedQid, updateQuestionMutation],
  );

  // Add a new question (blank slate).
  const handleAddQuestion = useCallback(
    (qid: string, type: string) => {
      const newQuestionDef = { type } as QuestionDef;
      createQuestionMutation.mutate(
        {
          questionId: qid,
          question: newQuestionDef,
        },
        {
          onSuccess: () => {
            notifySuccess(`Question "${qid}" added`);
            handleCloseAddQuestion();
            setSelectedQid(qid);
          },
          onError: (err) => notifyError(err),
        },
      );
    },
    [createQuestionMutation, handleCloseAddQuestion, setSelectedQid],
  );

  // Delete a specific question.
  const handleDeleteQuestion = useCallback(
    (qid: string) => {
      deleteQuestionMutation.mutate(qid, {
        onSuccess: () => {
          notifySuccess(`Question "${qid}" deleted`);
          setConfirmDeleteQid(null);
          // Move selection to first remaining question
          const remaining = questionIds.filter((id) => id !== qid);
          setSelectedQid(remaining[0] ?? null);
        },
        onError: (err) => notifyError(err),
      });
    },
    [deleteQuestionMutation, questionIds, setSelectedQid],
  );

  // ── Shared toolbar ──────────────────────────────────────────────────────────

  const pageActions = (
    <QuestionsHeader
      onInfer={() => setConfirmInfer(true)}
      showInfer={hasSubmissions}
      onUpload={() => setOpenQsUpload(true)}
      onImport={() => setOpenQsImport(true)}
      onExport={hasQuestionSetRecord ? () => setOpenQsExport(true) : undefined}
      onDelete={() => setConfirmDeleteQs(true)}
      showDelete={hasQuestionSetRecord}
      disableDelete={deleteMutation.isPending}
      searchQuery={hasQuestions ? searchQuery : undefined}
      onSearchChange={hasQuestions ? (v) => setSearchQuery(v) : undefined}
      disabled={!hasSubmissions}
    />
  );

  if (!enabled) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loadingSubmissions || loadingQS || loadingQuestionSetStatus) {
    return (
      <PageShell title="Questions" actions={pageActions}>
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={200} />
        </Stack>
      </PageShell>
    );
  }

  // ── Locked: no submissions uploaded yet ───────────────────────────────────

  if (!hasSubmissions) {
    return (
      <PageShell title="Questions" actions={pageActions}>
        <Center py="xl">
          <Stack align="center" gap="md" maw={480} mx="auto">
            <IconQuestionMark size={40} opacity={0.3} />

            <Title order={4} ta="center">Questions are locked</Title>

            <Text c="dimmed" size="sm" ta="center">
              Questions define the structure of your assessment.
              You need to upload your submissions before you can set up questions.
            </Text>

            <Stack gap="xs" w="100%">
              <ActionOptionCard
                icon={<IconInbox size={14} />}
                iconColor="blue"
                title="Upload submissions first"
                description={<>Import a CSV from Examplify or any other source.{' '}<Anchor component={Link} to={`/assessments/${assessmentId}/submissions`} size="xs">Go to Submissions →</Anchor></>}
              />
            </Stack>
          </Stack>
        </Center>
      </PageShell>
    );
  }

  // ── Empty: no question set yet ─────────────────────────────────────────────
  // (shown once submissions exist)

  if (qsMissing || !hasQuestionSetRecord) {
    return (
      <PageShell title="Questions" actions={pageActions} updatedAt={qsRes?.status?.updated_at}>
        {errorQS && !qsMissing && (
          <ErrorAlert error={qsError} mb="md" />
        )}

        <Center py="xl">
          <Stack align="center" gap="md" maw={480} mx="auto">
            <IconQuestionMark size={40} opacity={0.3} />

            <Title order={4} ta="center">No questions configured yet</Title>

            <Text c="dimmed" size="sm" ta="center">
              Questions define the structure of your assessment. Choose one of
              the following options to get started:
            </Text>

            <Stack gap="xs" w="100%">
              <ActionOptionCard
                icon={<IconPlus size={14} />}
                iconColor="green"
                title="Start from scratch"
                description={<>Create an empty question set and add questions manually.{' '}<Anchor component="button" size="xs" onClick={handleCreateEmptyQuestionSet}>Start now →</Anchor></>}
              />

              {hasSubmissions && (
                <ActionOptionCard
                  icon={<IconBolt size={14} />}
                  iconColor="blue"
                  title="Infer from submissions"
                  description={<>Automatically detect questions from your uploaded CSV.{' '}<Anchor component="button" size="xs" onClick={() => setConfirmInfer(true)}>Infer now →</Anchor></>}
                />
              )}

              {!hasSubmissions && (
                <ActionOptionCard
                  icon={<IconInbox size={14} />}
                  iconColor="gray"
                  title="Upload submissions to infer"
                  description={<>Import a CSV to automatically detect questions.{' '}<Anchor component={Link} to={`/assessments/${assessmentId}/submissions`} size="xs">Go to Submissions →</Anchor></>}
                />
              )}

              <ActionOptionCard
                icon={<IconUpload size={14} />}
                iconColor="teal"
                title="Upload a question set"
                description={<>Load a YAML file defining your questions.{' '}<Anchor component="button" size="xs" onClick={() => setOpenQsUpload(true)}>Upload now →</Anchor></>}
              />

              <ActionOptionCard
                icon={<IconFileImport size={14} />}
                iconColor="violet"
                title="Import from another format"
                description={<>Import from a supported adapter (e.g. Examplify).{' '}<Anchor component="button" size="xs" onClick={() => setOpenQsImport(true)}>Import now →</Anchor></>}
              />
            </Stack>
          </Stack>
        </Center>

        <InferModal
          opened={confirmInfer}
          onClose={() => setConfirmInfer(false)}
          inferMutation={inferMutation}
        />
        {openQsUpload && (
          <Suspense fallback={null}>
            <QuestionSetUploadModal
              open={openQsUpload}
              assessmentId={assessmentId}
              onClose={() => setOpenQsUpload(false)}
            />
          </Suspense>
        )}
        {openQsImport && (
          <Suspense fallback={null}>
            <QuestionSetImportModal
              open={openQsImport}
              assessmentId={assessmentId}
              onClose={() => setOpenQsImport(false)}
            />
          </Suspense>
        )}
        {openQsExport && (
          <Suspense fallback={null}>
            <QuestionSetExportModal
              open={openQsExport}
              assessmentId={assessmentId}
              onClose={() => setOpenQsExport(false)}
            />
          </Suspense>
        )}
      </PageShell>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  const listPanel = (
    <QuestionListPanel
      questionIds={questionIds}
      questionTypesById={questionTypesById}
      selectedQid={selectedQid}
      onSelect={handleSelect}
      searchQuery={searchQuery}
      onAddQuestion={handleOpenAddQuestion}
    />
  );

  const detailPanel = selectedQid ? (
    <QuestionEditorPanel
      key={selectedQid}
      qid={selectedQid}
      questionDef={questionMap[selectedQid] as QuestionDef}
      updating={updateQuestionMutation.isPending}
      examples={examplesByQuestion[selectedQid] ?? []}
      loadingExamples={loadingParsed}
      examplesError={
        missingSubmissions
          ? 'No submissions available to derive example answers yet.'
          : undefined
      }
      onSave={handleSave}
      onEditStateChange={setDetailEditing}
      onDelete={() => setConfirmDeleteQid(selectedQid)}
      deleting={deleteQuestionMutation.isPending && confirmDeleteQid === selectedQid}
    />
  ) : (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <IconQuestionMark size={32} opacity={0.3} />
        {hasQuestions ? (
          <Text c="dimmed" size="sm">Select a question to view its details.</Text>
        ) : (
          <>
            <Text c="dimmed" size="sm">No questions yet.</Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={handleOpenAddQuestion}>
              Add your first question
            </Button>
          </>
        )}
      </Stack>
    </Center>
  );

  return (
    <PageShell
      title="Questions"
      actions={pageActions}
      updatedAt={qsRes?.status?.updated_at}
    >
      <Stack gap="md">
        <SectionStatusBadge
          isStale={isQuestionSetStale}
          show={showQuestionStatusBadge}
          staleMessage={getQuestionStatusMessage(
            isQuestionSetStale,
            missingQuestionIds.length,
            extraQuestionIds.length,
            choiceOptionDrifts.length,
          )}
          actions={questionStatusActions}
        />

        {errorQS && !qsMissing && (
          <ErrorAlert error={qsError} />
        )}
        {errorParsed && !missingSubmissions && (
          <ErrorAlert error={parsedError} />
        )}
        {errorQuestionSetStatus && (
          <ErrorAlert error={questionSetStatusError} />
        )}

        <MasterDetailLayout
          listPanel={listPanel}
          detailPanel={detailPanel}
          isDetailEditing={detailEditing}
          listWidth="170px"
          layoutHeight="calc(100dvh - 105px)"
          backLabel="Back to questions"
          mobileShowDetail={mobileShowDetail}
          onMobileShowDetailChange={setMobileShowDetail}
        />

        <InferModal
          opened={confirmInfer}
          onClose={() => setConfirmInfer(false)}
          inferMutation={inferMutation}
        />

        <Modal
          opened={confirmDeleteQs}
          onClose={() => setConfirmDeleteQs(false)}
          title="Delete Question Set"
        >
          <Text mb="md">
            This will delete the stored question set and any parsed examples. Continue?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmDeleteQs(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(undefined, {
                  onSuccess: () => {
                    setConfirmDeleteQs(false);
                    notifySuccess('Question set deleted');
                  },
                  onError: () => notifyErrorMessage('Delete failed'),
                })
              }
            >
              Delete
            </Button>
          </Group>
          {deleteMutation.isError && (
            <ErrorAlert error={deleteMutation.error} mt="sm" />
          )}
        </Modal>

        <UnsavedChangesModal
          opened={unsavedModalOpen}
          message="You have unsaved question edits. Continuing will discard them."
          onStay={handleStay}
          onDiscard={handleDiscard}
        />

        <AddQuestionModal
          opened={openAddQuestion}
          existingIds={questionIds}
          suggestedQuestionIds={missingQuestionIds}
          isSaving={createQuestionMutation.isPending}
          error={createQuestionMutation.isError ? createQuestionMutation.error : null}
          onClose={handleCloseAddQuestion}
          onAdd={handleAddQuestion}
        />

        {/* Confirm delete a single question */}
        <Modal
          opened={confirmDeleteQid !== null}
          onClose={() => setConfirmDeleteQid(null)}
          title="Delete Question"
          size="sm"
        >
          <Text mb="md">
            Delete question <strong>{confirmDeleteQid}</strong>? This cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmDeleteQid(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteQuestionMutation.isPending}
              onClick={() => confirmDeleteQid && handleDeleteQuestion(confirmDeleteQid)}
            >
              Delete
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={confirmSynchronizeQuestions}
          onClose={() => setConfirmSynchronizeQuestions(false)}
          title="Synchronize Questions"
          size="sm"
        >
          <Text mb="sm">
            This will synchronize the question set with the current submissions by adding newly detected questions, removing extra question IDs, and updating choice options from observed answers.
          </Text>
          {missingQuestionIds.length > 0 && (
            <>
              <Text fw={600} mb={4} size="sm">Questions to add</Text>
              <Text mb="sm" ff="monospace" size="sm">
                {missingQuestionIds.join(', ')}
              </Text>
            </>
          )}
          {extraQuestionIds.length > 0 && (
            <>
              <Text fw={600} mb={4} size="sm">Questions to remove</Text>
              <Text mb="md" ff="monospace" size="sm">
                {extraQuestionIds.join(', ')}
              </Text>
            </>
          )}
          {choiceOptionDrifts.length > 0 && (
            <>
              <Text fw={600} mb={4} size="sm">Choice options to update</Text>
              <Stack gap={4} mb="md">
                {choiceOptionDrifts.map((drift) => (
                  <Text key={drift.question_id} ff="monospace" size="sm">
                    {getChoiceOptionDriftSummary(drift)}
                  </Text>
                ))}
              </Stack>
            </>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmSynchronizeQuestions(false)}>
              Cancel
            </Button>
            <Button
              color="orange"
              loading={syncQuestionSetMutation.isPending}
              onClick={() => void handleSynchronizeQuestions()}
            >
              Synchronize
            </Button>
          </Group>
        </Modal>

        {openQsUpload && (
          <Suspense fallback={null}>
            <QuestionSetUploadModal
              open={openQsUpload}
              assessmentId={assessmentId}
              onClose={() => setOpenQsUpload(false)}
            />
          </Suspense>
        )}
        {openQsImport && (
          <Suspense fallback={null}>
            <QuestionSetImportModal
              open={openQsImport}
              assessmentId={assessmentId}
              onClose={() => setOpenQsImport(false)}
            />
          </Suspense>
        )}
        {openQsExport && (
          <Suspense fallback={null}>
            <QuestionSetExportModal
              open={openQsExport}
              assessmentId={assessmentId}
              onClose={() => setOpenQsExport(false)}
            />
          </Suspense>
        )}
      </Stack>
    </PageShell>
  );
};

// ── InferModal ─────────────────────────────────────────────────────────────────

interface InferModalProps {
  opened: boolean;
  onClose: () => void;
  inferMutation: ReturnType<typeof useInferAndParseQuestionSet>;
}

const InferModal: React.FC<InferModalProps> = ({ opened, onClose, inferMutation }) => (
  <Modal opened={opened} onClose={onClose} title="Replace Questions">
    <Text mb="md">
      This will replace the existing questions by inferring from current submissions. Proceed?
    </Text>
    <Group justify="flex-end">
      <Button variant="default" onClick={onClose}>
        Cancel
      </Button>
      <Button
        loading={inferMutation.isPending}
        onClick={() =>
          inferMutation.mutate(undefined, {
            onSuccess: () => {
              onClose();
              notifySuccess('Questions inferred from submissions');
            },
            onError: () => notifyErrorMessage('Inference failed'),
          })
        }
      >
        Proceed
      </Button>
    </Group>
    {inferMutation.isError && (
      <ErrorAlert error={inferMutation.error} mt="sm" />
    )}
  </Modal>
);

export default QuestionsPage;
