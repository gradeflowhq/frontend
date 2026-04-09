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
import { notifications } from '@mantine/notifications';
import {
  IconBolt,
  IconFileImport,
  IconInbox,
  IconQuestionMark,
  IconUpload,
} from '@tabler/icons-react';
import React, { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { ActionOptionCard } from '@components/common/ActionOptionCard';
import MasterDetailLayout from '@components/common/MasterDetailLayout';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { UnsavedChangesModal } from '@components/common/UnsavedChangesModal';
import {
  useDeleteQuestionSet,
  useInferAndParseQuestionSet,
  useParsedSubmissions,
  useQuestionSet,
  useUpdateQuestionSet,
} from '@features/questions/api';
import { QuestionsHeader } from '@features/questions/components';
import QuestionEditorPanel from '@features/questions/components/QuestionEditorPanel';
import QuestionListPanel from '@features/questions/components/QuestionListPanel';
const QuestionSetImportModal = lazy(
  () => import('@features/questions/components/QuestionSetImportModal'),
);
const QuestionSetUploadModal = lazy(
  () => import('@features/questions/components/QuestionSetUploadModal'),
);
import { buildExamplesFromParsed, getQuestionIdsSorted } from '@features/questions/helpers';
import { useSubmissions } from '@features/submissions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useUrlSelectedId } from '@hooks/useUrlSelectedId';
import { getErrorMessage } from '@utils/error';

import type { QuestionSetInput } from '@api/models';
import type { QuestionDef } from '@features/questions/components/QuestionEditorPanel';

const QuestionsPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  useDocumentTitle(`Questions - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const safeAssessmentId = assessmentId;
  const enabled = Boolean(assessmentId);

  const [confirmInfer, setConfirmInfer] = useState(false);
  const [confirmDeleteQs, setConfirmDeleteQs] = useState(false);
  const [openQsUpload, setOpenQsUpload] = useState(false);
  const [openQsImport, setOpenQsImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [detailEditing, setDetailEditing] = useState(false);
  const [pendingQid, setPendingQid] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

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

  const questionMap = useMemo(
    () => (qsMissing ? {} : (qsRes?.question_set?.question_map ?? {})),
    [qsMissing, qsRes],
  );
  const hasQuestionSet = !qsMissing && !!qsRes?.question_set && Object.keys(questionMap).length > 0;

  const questionIds = useMemo(() => getQuestionIdsSorted(questionMap), [questionMap]);

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
  } = useParsedSubmissions(safeAssessmentId, hasQuestionSet && enabled);

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

  // No-op save to acknowledge staleness and refresh updated_at
  const handleDismissStale = useCallback(() => {
    if (!qsRes?.question_set) return;
    updateMutation.mutate(qsRes.question_set as QuestionSetInput, {
      onError: () => notifications.show({ color: 'red', message: 'Could not acknowledge staleness' }),
    });
  }, [qsRes, updateMutation]);

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
        onSuccess: () => notifications.show({ color: 'green', message: 'Question saved' }),
        onError: (err) => notifications.show({ color: 'red', message: getErrorMessage(err) }),
      });
    },
    [selectedQid, questionMap, updateMutation],
  );

  // ── Shared toolbar ──────────────────────────────────────────────────────────

  const pageActions = (
    <QuestionsHeader
      onInfer={() => setConfirmInfer(true)}
      showInfer={hasSubmissions}
      onUpload={() => setOpenQsUpload(true)}
      onImport={() => setOpenQsImport(true)}
      onDelete={() => setConfirmDeleteQs(true)}
      showDelete={hasQuestionSet}
      disableDelete={deleteMutation.isPending}
      searchQuery={searchQuery}
      onSearchChange={(v) => setSearchQuery(v)}
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

  // ── Empty: submissions exist but no question set yet ───────────────────────

  if (qsMissing || !hasQuestionSet) {
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
                icon={<IconBolt size={14} />}
                iconColor="blue"
                title="Infer from submissions"
                description={<>Automatically detect questions from your uploaded CSV.{' '}<Anchor component="button" size="xs" onClick={() => setConfirmInfer(true)}>Infer now →</Anchor></>}
              />

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
    />
  ) : (
    <Text c="dimmed" size="sm">
      Select a question to view its details.
    </Text>
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
          staleMessage="Questions may be out of date — submissions have been updated since the last question set was configured."
          onDismiss={qsRes?.status?.is_stale ? handleDismissStale : undefined}
          isDismissing={updateMutation.isPending}
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
                    notifications.show({ color: 'green', message: 'Question set deleted' });
                  },
                  onError: () =>
                    notifications.show({ color: 'red', message: 'Delete failed' }),
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

        <Suspense fallback={null}>
          <QuestionSetUploadModal
            open={openQsUpload}
            assessmentId={safeAssessmentId}
            onClose={() => setOpenQsUpload(false)}
          />
        </Suspense>
        <Suspense fallback={null}>
          <QuestionSetImportModal
            open={openQsImport}
            assessmentId={safeAssessmentId}
            onClose={() => setOpenQsImport(false)}
          />
        </Suspense>
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
              notifications.show({ color: 'green', message: 'Questions inferred from submissions' });
            },
            onError: () => notifications.show({ color: 'red', message: 'Inference failed' }),
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

