import { Alert, Button, Center, Group, Modal, Skeleton, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconQuestionMark } from '@tabler/icons-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import {
  useQuestionSet,
  useParsedSubmissions,
  useUpdateQuestionSet,
  useInferAndParseQuestionSet,
  useDeleteQuestionSet,
} from '@features/questions/api';
import { QuestionsHeader } from '@features/questions/components';
import QuestionEditorPanel from '@features/questions/components/QuestionEditorPanel';
import QuestionListPanel from '@features/questions/components/QuestionListPanel';
import QuestionSetImportModal from '@features/questions/components/QuestionSetImportModal';
import QuestionSetUploadModal from '@features/questions/components/QuestionSetUploadModal';
import { buildExamplesFromParsed, getQuestionIdsSorted } from '@features/questions/helpers';
import { MasterDetailLayout } from '@features/rules/components';
import { useSubmissions } from '@features/submissions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import type { QuestionSetInput } from '@api/models';
import type { QuestionDef } from '@features/questions/components/QuestionEditorPanel';

const QuestionsPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { assessment } = useAssessmentContext();
  const [searchParams, setSearchParams] = useSearchParams();

  useDocumentTitle(`Questions - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const safeAssessmentId = assessmentId ?? '';
  const enabled = Boolean(assessmentId);

  const [confirmInfer, setConfirmInfer] = useState(false);
  const [confirmDeleteQs, setConfirmDeleteQs] = useState(false);
  const [openQsUpload, setOpenQsUpload] = useState(false);
  const [openQsImport, setOpenQsImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Unsaved-changes guard state
  const [detailEditing, setDetailEditing] = useState(false);
  const [pendingQid, setPendingQid] = useState<string | null>(null);
  // Controlled mobile-detail visibility
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Raw submissions (to decide whether to show the Infer button)
  const { data: subsRes } = useSubmissions(safeAssessmentId);
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

  const questionTypesById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [qid, def] of Object.entries(questionMap)) {
      const typedDef = def as { type?: string } | undefined;
      m[qid] = typedDef?.type ?? 'TEXT';
    }
    return m;
  }, [questionMap]);

  // URL-driven selection: ?q=questionId
  const urlQid = searchParams.get('q');
  const selectedQid = useMemo(() => {
    if (urlQid && questionIds.includes(urlQid)) return urlQid;
    return questionIds[0] ?? null;
  }, [urlQid, questionIds]);

  // Initialise URL param on first render if missing.
  React.useEffect(() => {
    if (!urlQid && questionIds.length > 0 && questionIds[0]) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('q', questionIds[0]!);
          return next;
        },
        { replace: true },
      );
    }
  }, [urlQid, questionIds, setSearchParams]);

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
    updateMutation.mutate(qsRes.question_set as unknown as QuestionSetInput, {
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
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('q', qid);
          return next;
        },
        { replace: true },
      );
      setMobileShowDetail(true);
    },
    [detailEditing, setSearchParams],
  );

  // Desktop unsaved-changes guard: user confirmed navigation.
  const handleConfirmNavigation = useCallback(() => {
    if (!pendingQid) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('q', pendingQid);
        return next;
      },
      { replace: true },
    );
    setPendingQid(null);
  }, [pendingQid, setSearchParams]);

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
        onError: () => notifications.show({ color: 'red', message: 'Save failed' }),
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
    />
  );

  if (!enabled) {
    return <Alert color="red">Assessment ID is missing.</Alert>;
  }

  // ── Empty state — no question set yet ──────────────────────────────────────
  if (!loadingQS && (qsMissing || !hasQuestionSet)) {
    return (
      <PageShell title="Questions" actions={pageActions} updatedAt={qsRes?.status?.updated_at}>
        {errorQS && !qsMissing && (
          <Alert color="red" mb="md">{getErrorMessage(qsError)}</Alert>
        )}
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconQuestionMark size={32} opacity={0.4} />
            <Title order={5}>No questions yet</Title>
            <Text c="dimmed" size="sm">
              Upload or import a question set, or infer from submissions.
            </Text>
          </Stack>
        </Center>
        <InferModal
          opened={confirmInfer}
          onClose={() => setConfirmInfer(false)}
          inferMutation={inferMutation}
        />
        {openQsUpload && (
          <QuestionSetUploadModal
            open={openQsUpload}
            assessmentId={safeAssessmentId}
            onClose={() => setOpenQsUpload(false)}
          />
        )}
        {openQsImport && (
          <QuestionSetImportModal
            open={openQsImport}
            assessmentId={safeAssessmentId}
            onClose={() => setOpenQsImport(false)}
          />
        )}
      </PageShell>
    );
  }

  // ── Main view with master-detail layout ────────────────────────────────────

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
      <Stack
        gap="md"
      >
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

        {loadingQS ? (
          <Stack gap="xs">
            <Skeleton height={40} />
            <Skeleton height={200} />
          </Stack>
        ) : (
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
        )}

        {/* ── Modals ──────────────────────────────────────────────────────── */}

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
        <Modal
          opened={pendingQid !== null}
          onClose={() => setPendingQid(null)}
          title="Unsaved changes"
          size="sm"
        >
          <Text mb="md">
            You have unsaved question edits. Navigating away will discard them.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => setPendingQid(null)}>
              Stay
            </Button>
            <Button color="red" onClick={handleConfirmNavigation}>
              Discard &amp; Continue
            </Button>
          </Group>
        </Modal>

        {openQsUpload && (
          <QuestionSetUploadModal
            open={openQsUpload}
            assessmentId={safeAssessmentId}
            onClose={() => setOpenQsUpload(false)}
          />
        )}
        {openQsImport && (
          <QuestionSetImportModal
            open={openQsImport}
            assessmentId={safeAssessmentId}
            onClose={() => setOpenQsImport(false)}
          />
        )}
      </Stack>
    </PageShell>
  );
};

// ── InferModal ────────────────────────────────────────────────────────────────
// Extracted to avoid repetition in both conditional renders.

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

