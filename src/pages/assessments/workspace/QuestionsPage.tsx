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
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { ActionOptionCard } from '@components/common/ActionOptionCard';
import MasterDetailLayout from '@components/common/MasterDetailLayout';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { UnsavedChangesModal } from '@components/common/UnsavedChangesModal';
import {
  inferQuestionSetFromSubmissions,
  useDeleteQuestionSet,
  useInferAndParseQuestionSet,
  useParsedSubmissions,
  useQuestionSet,
  useUpdateQuestionSet,
} from '@features/questions/api';
import { QuestionsHeader } from '@features/questions/components';
import AddQuestionModal from '@features/questions/components/AddQuestionModal';
import QuestionEditorPanel from '@features/questions/components/QuestionEditorPanel';
import QuestionListPanel from '@features/questions/components/QuestionListPanel';
const QuestionSetImportModal = lazy(
  () => import('@features/questions/components/QuestionSetImportModal'),
);
const QuestionSetUploadModal = lazy(
  () => import('@features/questions/components/QuestionSetUploadModal'),
);
import {
  buildExamplesFromParsed,
  getInvalidQuestionIds,
  getMissingQuestionIds,
  getQuestionIdsSorted,
  getSubmissionQuestionIds,
  synchronizeQuestionMap,
} from '@features/questions/helpers';
import { useSubmissions } from '@features/submissions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useNavigationGuard } from '@hooks/useNavigationGuard';
import { useUrlSelectedId } from '@hooks/useUrlSelectedId';
import { getErrorMessage } from '@utils/error';
import { notifyError, notifyErrorMessage, notifySuccess } from '@utils/notifications';

import type { QuestionSetInput, QuestionSetInputQuestionMap } from '@api/models';
import type { QuestionDef } from '@features/questions/components/QuestionEditorPanel';

const getQuestionStatusMessage = (
  isStale: boolean,
  missingQuestionCount: number,
  invalidQuestionCount: number,
): string => {
  const outOfSyncQuestionCount = missingQuestionCount + invalidQuestionCount;

  if (outOfSyncQuestionCount > 0) {
    const parts = [];

    if (missingQuestionCount > 0) {
      parts.push(
        `${missingQuestionCount} new question ID${missingQuestionCount === 1 ? '' : 's'}`,
      );
    }

    if (invalidQuestionCount > 0) {
      parts.push(
        `${invalidQuestionCount} invalid question ID${invalidQuestionCount === 1 ? '' : 's'}`,
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

const QuestionsPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  useDocumentTitle(`Questions - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const safeAssessmentId = assessmentId;
  const enabled = Boolean(assessmentId);

  const [confirmInfer, setConfirmInfer] = useState(false);
  const [confirmDeleteQs, setConfirmDeleteQs] = useState(false);
  const [openQsUpload, setOpenQsUpload] = useState(false);
  const [openQsImport, setOpenQsImport] = useState(false);
  const [openAddQuestion, setOpenAddQuestion] = useState(false);
  const [confirmDeleteQid, setConfirmDeleteQid] = useState<string | null>(null);
  const [confirmSynchronizeQuestions, setConfirmSynchronizeQuestions] = useState(false);
  const [dismissedQuestionSyncSignature, setDismissedQuestionSyncSignature] = useState<string | null>(null);
  const [isSynchronizingQuestions, setIsSynchronizingQuestions] = useState(false);
  const [statusAction, setStatusAction] = useState<'dismiss' | 'sync' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingAddedQuestion, setPendingAddedQuestion] = useState<{
    qid: string;
    def: QuestionDef;
  } | null>(null);

  const [detailEditing, setDetailEditing] = useState(false);
  const [pendingQid, setPendingQid] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Block route transitions while editing (e.g. navigating to another page)
  const routeBlocker = useNavigationGuard(detailEditing);

  const {
    data: subsRes,
    isLoading: loadingSubmissions,
  } = useSubmissions(safeAssessmentId);
  const hasSubmissions = (subsRes?.raw_submissions?.length ?? 0) > 0;

  // Question set
  const {
    data: qsRes,
    isLoading: loadingQS,
    isError: errorQS,
    error: qsError,
  } = useQuestionSet(safeAssessmentId, enabled);

  const qsMissing = useMemo(() => {
    const err = qsError as { response?: { status?: number } } | undefined;
    return err?.response?.status === 404;
  }, [qsError]);

  const baseQuestionMap = useMemo(
    () => (qsMissing ? {} : (qsRes?.question_set?.question_map ?? {})),
    [qsMissing, qsRes],
  );
  const questionMap = useMemo(() => {
    if (!pendingAddedQuestion || baseQuestionMap[pendingAddedQuestion.qid]) {
      return baseQuestionMap;
    }

    return {
      ...baseQuestionMap,
      [pendingAddedQuestion.qid]: pendingAddedQuestion.def,
    };
  }, [baseQuestionMap, pendingAddedQuestion]);

  useEffect(() => {
    if (pendingAddedQuestion && baseQuestionMap[pendingAddedQuestion.qid]) {
      setPendingAddedQuestion(null);
    }
  }, [baseQuestionMap, pendingAddedQuestion]);

  // "record exists" = API has a QS object (even with 0 questions)
  const hasQuestionSetRecord = !qsMissing && !!qsRes?.question_set;
  // "has questions" = at least one question configured
  const hasQuestions = hasQuestionSetRecord && Object.keys(questionMap).length > 0;

  const questionIds = useMemo(() => getQuestionIdsSorted(questionMap), [questionMap]);

  const submissionQuestionIds = useMemo(
    () => getSubmissionQuestionIds(subsRes?.raw_submissions),
    [subsRes],
  );

  // Available question IDs derived from raw submissions (for the "Add question" dropdown)
  const submissionQids = useMemo(() => {
    return submissionQuestionIds.filter((qid) => !questionIds.includes(qid));
  }, [submissionQuestionIds, questionIds]);

  const invalidQuestionIds = useMemo(
    () => getInvalidQuestionIds(questionMap, submissionQuestionIds),
    [questionMap, submissionQuestionIds],
  );
  const missingQuestionIds = useMemo(
    () => getMissingQuestionIds(questionMap, submissionQuestionIds),
    [questionMap, submissionQuestionIds],
  );

  const { selectedId: selectedQid, setSelectedId: setSelectedQid } = useUrlSelectedId(questionIds, 'q');

  const questionTypesById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [qid, def] of Object.entries(questionMap)) {
      const typedDef = def as { type?: string } | undefined;
      m[qid] = typedDef?.type ?? 'TEXT';
    }
    return m;
  }, [questionMap]);

  // Parsed submissions (examples)
  const {
    data: parsedRes,
    isLoading: loadingParsed,
    isError: errorParsed,
    error: parsedError,
  } = useParsedSubmissions(safeAssessmentId, hasQuestionSetRecord && enabled);

  const parsedErr = parsedError as { response?: { status?: number } } | undefined;
  const missingSubmissions = errorParsed && parsedErr?.response?.status === 404;

  // Update question set (manual edits)
  const updateMutation = useUpdateQuestionSet(safeAssessmentId);

  // Delete question set
  const deleteMutation = useDeleteQuestionSet(safeAssessmentId);

  // Infer (replace) questions from submissions, then parse
  const inferMutation = useInferAndParseQuestionSet(safeAssessmentId);

  // Examples from parsed submissions
  const examplesByQuestion = useMemo(
    () => buildExamplesFromParsed(parsedRes),
    [parsedRes],
  );

  const hasInvalidQuestionIds = invalidQuestionIds.length > 0;
  const hasMissingQuestionIds = missingQuestionIds.length > 0;
  const hasOutOfSyncQuestions = hasInvalidQuestionIds || hasMissingQuestionIds;
  const isQuestionSetStale = Boolean(qsRes?.status?.is_stale);
  const isQuestionActionPending = updateMutation.isPending || isSynchronizingQuestions;
  const questionSyncSignature = useMemo(
    () => JSON.stringify({ invalid: invalidQuestionIds, missing: missingQuestionIds }),
    [invalidQuestionIds, missingQuestionIds],
  );
  const showQuestionStatusBadge = isQuestionSetStale || (
    hasOutOfSyncQuestions && dismissedQuestionSyncSignature !== questionSyncSignature
  );

  // No-op save to acknowledge staleness and refresh updated_at
  const handleDismissStatus = useCallback(() => {
    if (hasOutOfSyncQuestions) {
      setDismissedQuestionSyncSignature(questionSyncSignature);
    }

    if (!isQuestionSetStale) {
      notifySuccess('Question warning dismissed');
      return;
    }

    if (!hasQuestionSetRecord) return;

    setStatusAction('dismiss');
    updateMutation.mutate({
      question_map: baseQuestionMap as QuestionSetInput['question_map'],
    }, {
      onSuccess: () => {
        notifySuccess('Question warning dismissed');
      },
      onError: () => {
        if (hasOutOfSyncQuestions) {
          setDismissedQuestionSyncSignature(null);
        }
        notifyErrorMessage('Could not dismiss warning');
      },
      onSettled: () => setStatusAction(null),
    });
  }, [
    baseQuestionMap,
    hasOutOfSyncQuestions,
    hasQuestionSetRecord,
    isQuestionSetStale,
    questionSyncSignature,
    updateMutation,
  ]);

  const handleSynchronizeQuestions = useCallback(async () => {
    setStatusAction('sync');
    setIsSynchronizingQuestions(true);

    try {
      const inferredQuestionSet = await inferQuestionSetFromSubmissions(safeAssessmentId);
      const nextQuestionMap = synchronizeQuestionMap(
        questionMap,
        (inferredQuestionSet.question_set?.question_map ?? {}) as QuestionSetInputQuestionMap,
      );

      await updateMutation.mutateAsync({
        question_map: nextQuestionMap as QuestionSetInput['question_map'],
      });

      const remainingIds = getQuestionIdsSorted(nextQuestionMap);
      if (selectedQid && invalidQuestionIds.includes(selectedQid)) {
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
      if (invalidQuestionIds.length > 0) {
        changes.push(
          invalidQuestionIds.length === 1
            ? `Removed invalid question: ${invalidQuestionIds[0]}`
            : `Removed invalid questions: ${invalidQuestionIds.join(', ')}`,
        );
      }

      notifySuccess(changes.join('; ') || 'Questions synchronized');
      setDismissedQuestionSyncSignature(null);
    } catch (err) {
      notifyError(err);
    } finally {
      setIsSynchronizingQuestions(false);
      setStatusAction(null);
    }
  }, [
    invalidQuestionIds,
    missingQuestionIds,
    questionMap,
    selectedQid,
    safeAssessmentId,
    setSelectedQid,
    updateMutation,
  ]);

  const questionStatusActions = useMemo(() => {
    const actions = [];

    if (hasOutOfSyncQuestions) {
      actions.push({
        label: 'Synchronize questions',
        onClick: () => setConfirmSynchronizeQuestions(true),
        color: 'orange',
        variant: 'light' as const,
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
    } else if (hasOutOfSyncQuestions) {
      actions.push({
        label: 'Dismiss',
        onClick: handleDismissStatus,
        disabled: isQuestionActionPending,
      });
    }

    return actions;
  }, [handleDismissStatus, hasOutOfSyncQuestions, isQuestionActionPending, isQuestionSetStale, statusAction]);

  // Question selection — guards against navigating away with unsaved edits.
  const handleSelect = useCallback(
    (qid: string): void => {
      if (detailEditing) {
        setPendingQid(qid);
        return;
      }
      setSelectedQid(qid);
      setMobileShowDetail(true);
    },
    [detailEditing, setSelectedQid],
  );

  // Desktop unsaved-changes guard: user confirmed navigation.
  const handleConfirmNavigation = useCallback(() => {
    if (!pendingQid) return;
    setSelectedQid(pendingQid);
    setPendingQid(null);
  }, [pendingQid, setSelectedQid]);

  const handleOpenAddQuestion = useCallback(() => {
    updateMutation.reset();
    setOpenAddQuestion(true);
  }, [updateMutation]);

  const handleCloseAddQuestion = useCallback(() => {
    updateMutation.reset();
    setOpenAddQuestion(false);
  }, [updateMutation]);

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
      const next: QuestionSetInput = {
        question_map: {
          ...questionMap,
          [selectedQid]: updated,
        } as QuestionSetInput['question_map'],
      };
      await updateMutation.mutateAsync(next, {
        onSuccess: () => notifySuccess('Question saved'),
        onError: (err) => notifyError(err),
      });
    },
    [selectedQid, questionMap, updateMutation],
  );

  // Add a new question (blank slate).
  const handleAddQuestion = useCallback(
    (qid: string, type: string) => {
      const newQuestionDef = { type } as QuestionDef;
      const next: QuestionSetInput = {
        question_map: {
          ...questionMap,
          [qid]: newQuestionDef,
        } as QuestionSetInput['question_map'],
      };
      updateMutation.mutate(next, {
        onSuccess: () => {
          notifySuccess(`Question "${qid}" added`);
          setPendingAddedQuestion({ qid, def: newQuestionDef });
          handleCloseAddQuestion();
          setSelectedQid(qid);
        },
        onError: (err) => notifyError(err),
      });
    },
    [handleCloseAddQuestion, questionMap, updateMutation, setSelectedQid],
  );

  // Delete a specific question.
  const handleDeleteQuestion = useCallback(
    (qid: string) => {
      const next: QuestionSetInput = {
        question_map: Object.fromEntries(
          Object.entries(questionMap).filter(([id]) => id !== qid),
        ) as QuestionSetInput['question_map'],
      };
      updateMutation.mutate(next, {
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
    [questionMap, questionIds, updateMutation, setSelectedQid],
  );

  // ── Shared toolbar ──────────────────────────────────────────────────────────

  const pageActions = (
    <QuestionsHeader
      onInfer={() => setConfirmInfer(true)}
      showInfer={hasSubmissions}
      onUpload={() => setOpenQsUpload(true)}
      onImport={() => setOpenQsImport(true)}
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

  if (loadingSubmissions || loadingQS) {
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
                description={<>Import a CSV from Examplify or any other source.{' '}<Anchor component={Link} to={`/assessments/${safeAssessmentId}/submissions`} size="xs">Go to Submissions →</Anchor></>}
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
          <Alert color="red" mb="md">{getErrorMessage(qsError)}</Alert>
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
                  description={<>Import a CSV to automatically detect questions.{' '}<Anchor component={Link} to={`/assessments/${safeAssessmentId}/submissions`} size="xs">Go to Submissions →</Anchor></>}
                />
              )}

              <ActionOptionCard
                icon={<IconUpload size={14} />}
                iconColor="teal"
                title="Upload a question set"
                description={<>Load a YAML or JSON file defining your questions.{' '}<Anchor component="button" size="xs" onClick={() => setOpenQsUpload(true)}>Upload now →</Anchor></>}
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
              assessmentId={safeAssessmentId}
              onClose={() => setOpenQsUpload(false)}
            />
          </Suspense>
        )}
        {openQsImport && (
          <Suspense fallback={null}>
            <QuestionSetImportModal
              open={openQsImport}
              assessmentId={safeAssessmentId}
              onClose={() => setOpenQsImport(false)}
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
      updating={updateMutation.isPending}
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
      deleting={updateMutation.isPending && confirmDeleteQid === selectedQid}
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
          isStale={qsRes?.status?.is_stale}
          show={showQuestionStatusBadge}
          staleMessage={getQuestionStatusMessage(isQuestionSetStale, missingQuestionIds.length, invalidQuestionIds.length)}
          actions={questionStatusActions}
        />

        {errorQS && !qsMissing && (
          <Alert color="red">{getErrorMessage(qsError)}</Alert>
        )}
        {errorParsed && !missingSubmissions && (
          <Alert color="red">{getErrorMessage(parsedError)}</Alert>
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
            <Alert color="red" mt="sm">
              {getErrorMessage(deleteMutation.error)}
            </Alert>
          )}
        </Modal>

        {/* Desktop unsaved-changes guard */}
        <UnsavedChangesModal
          opened={pendingQid !== null}
          message="You have unsaved question edits. Navigating away will discard them."
          onStay={() => setPendingQid(null)}
          onDiscard={handleConfirmNavigation}
        />

        {/* Route-level guard — blocks navigation to other pages */}
        <UnsavedChangesModal
          opened={routeBlocker.state === 'blocked'}
          message="You have unsaved question edits. Leaving this page will discard them."
          onStay={() => routeBlocker.reset?.()}
          onDiscard={() => routeBlocker.proceed?.()}
        />

        <AddQuestionModal
          opened={openAddQuestion}
          existingIds={questionIds}
          submissionQids={submissionQids}
          isSaving={updateMutation.isPending}
          error={updateMutation.isError ? updateMutation.error : null}
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
              loading={updateMutation.isPending}
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
            This will synchronize the question set with the current submissions by adding newly detected questions and removing question IDs that no longer exist.
          </Text>
          {missingQuestionIds.length > 0 && (
            <>
              <Text fw={600} mb={4} size="sm">Questions to add</Text>
              <Text mb="sm" ff="monospace" size="sm">
                {missingQuestionIds.join(', ')}
              </Text>
            </>
          )}
          {invalidQuestionIds.length > 0 && (
            <>
              <Text fw={600} mb={4} size="sm">Questions to remove</Text>
              <Text mb="md" ff="monospace" size="sm">
                {invalidQuestionIds.join(', ')}
              </Text>
            </>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmSynchronizeQuestions(false)}>
              Cancel
            </Button>
            <Button color="orange" loading={isSynchronizingQuestions} onClick={() => void handleSynchronizeQuestions()}>
              Synchronize
            </Button>
          </Group>
        </Modal>

        {openQsUpload && (
          <Suspense fallback={null}>
            <QuestionSetUploadModal
              open={openQsUpload}
              assessmentId={safeAssessmentId}
              onClose={() => setOpenQsUpload(false)}
            />
          </Suspense>
        )}
        {openQsImport && (
          <Suspense fallback={null}>
            <QuestionSetImportModal
              open={openQsImport}
              assessmentId={safeAssessmentId}
              onClose={() => setOpenQsImport(false)}
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
      <Alert color="red" mt="sm">
        {getErrorMessage(inferMutation.error)}
      </Alert>
    )}
  </Modal>
);

export default QuestionsPage;

