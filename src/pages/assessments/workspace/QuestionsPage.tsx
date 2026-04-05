import { Alert, Box, Button, Drawer, Group, Modal, Select, Skeleton, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React from 'react';
import { useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import AnswerText from '@components/common/AnswerText';
import PageShell from '@components/common/PageShell';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { SchemaForm } from '@components/forms/SchemaForm';
import {
  useQuestionSet,
  useParsedSubmissions,
  useUpdateQuestionSet,
  useInferAndParseQuestionSet,
  useDeleteQuestionSet,
} from '@features/questions/api';
import { QuestionsHeader, QuestionsTable } from '@features/questions/components';
import QuestionSetImportModal from '@features/questions/components/QuestionSetImportModal';
import QuestionSetUploadModal from '@features/questions/components/QuestionSetUploadModal';
import { buildExamplesFromParsed } from '@features/questions/helpers';
import { useSubmissions } from '@features/submissions/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import questionsSchema from '@schemas/questions.json';
import { getErrorMessage } from '@utils/error';

import type { QuestionSetInput, ChoiceQuestion, MultiValuedQuestion, TextQuestion, NumericQuestion } from '@api/models';
import type { JSONSchema7Definition } from 'json-schema';

type QuestionDef = ChoiceQuestion | MultiValuedQuestion | TextQuestion | NumericQuestion;

const QUESTION_TYPES = ['TEXT', 'NUMERIC', 'CHOICE', 'MULTI_VALUED'] as const;

const selectRootSchema = (type: string | undefined) => {
  const dict = questionsSchema as Record<string, unknown>;
  switch (type) {
    case 'CHOICE': return dict.ChoiceQuestion ?? null;
    case 'MULTI_VALUED': return dict.MultiValuedQuestion ?? null;
    case 'NUMERIC': return dict.NumericQuestion ?? null;
    case 'TEXT':
    default: return dict.TextQuestion ?? null;
  }
};

const QuestionsPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { assessment } = useAssessmentContext();

  useDocumentTitle(`Questions - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const safeAssessmentId = assessmentId ?? '';
  const enabled = Boolean(assessmentId);
  const [confirmInfer, setConfirmInfer] = React.useState(false);
  const [confirmDeleteQs, setConfirmDeleteQs] = React.useState(false);
  const [openQsUpload, setOpenQsUpload] = React.useState(false);
  const [openQsImport, setOpenQsImport] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Drawer state
  const [editingQid, setEditingQid] = React.useState<string | null>(null);
  const [editingDraft, setEditingDraft] = React.useState<Partial<QuestionDef> | null>(null);

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

  const qsMissing = React.useMemo(() => {
    const err = qsError as { response?: { status?: number; data?: { detail?: unknown } }; message?: string } | undefined;
    return err?.response?.status === 404;
  }, [qsError]);

  const questionMap = qsMissing ? {} : (qsRes?.question_set?.question_map ?? {});
  const hasQuestionSet = !qsMissing && !!qsRes?.question_set && Object.keys(questionMap).length > 0;

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
  const examplesByQuestion = React.useMemo<Record<string, string[]>>(
    () => buildExamplesFromParsed(parsedRes) as Record<string, string[]>,
    [parsedRes]
  );

  const openEditDrawer = (qid: string) => {
    setEditingQid(qid);
    setEditingDraft({ ...(questionMap[qid] as QuestionDef) });
  };

  const closeEditDrawer = () => {
    setEditingQid(null);
    setEditingDraft(null);
  };

  // No-op save to acknowledge staleness and refresh updated_at
  const handleDismissStale = React.useCallback(() => {
    if (!qsRes?.question_set) return;
    updateMutation.mutate(qsRes.question_set as unknown as QuestionSetInput, {
      onError: () => notifications.show({ color: 'red', message: 'Could not acknowledge staleness' }),
    });
  }, [qsRes, updateMutation]);

  const saveEditDrawer = async () => {
    if (!editingQid || !editingDraft) return;
    const next: QuestionSetInput = {
      question_map: {
        ...questionMap,
        [editingQid]: { ...(questionMap[editingQid] as QuestionDef), ...(editingDraft as QuestionDef) },
      } as QuestionSetInput['question_map'],
    };
    await updateMutation.mutateAsync(next, {
      onSuccess: () => {
        notifications.show({ color: 'green', message: 'Question saved' });
        closeEditDrawer();
      },
      onError: () => notifications.show({ color: 'red', message: 'Save failed' }),
    });
  };

  const drawerType = (editingDraft?.type as string) ?? 'TEXT';
  const drawerRootSchema = selectRootSchema(drawerType);
  const drawerExamples = editingQid ? (examplesByQuestion[editingQid] ?? []) : [];

  return (
    <PageShell
      title="Questions"
      actions={
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
      }
    >
      <Stack gap="md">
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
        <>
          <SectionStatusBadge
            updatedAt={qsRes?.status?.updated_at}
            isStale={qsRes?.status?.is_stale}
            staleMessage="Questions may be out of date — submissions have been updated since the last question set was configured."
            onDismiss={qsRes?.status?.is_stale ? handleDismissStale : undefined}
            isDismissing={updateMutation.isPending}
          />
          <QuestionsTable
            questionMap={questionMap}
            examplesByQuestion={examplesByQuestion}
            onUpdateQuestionSet={async (next: QuestionSetInput) => {
              await updateMutation.mutateAsync(next, {
                onSuccess: () => notifications.show({ color: 'green', message: 'Question set saved' }),
                onError: () => notifications.show({ color: 'red', message: 'Save failed' }),
              });
            }}
            onEdit={openEditDrawer}
            updating={updateMutation.isPending}
            updateError={updateMutation.isError ? updateMutation.error : null}
            searchQuery={searchQuery}
            loadingQuestions={loadingQS}
            loadingExamples={loadingParsed}
            examplesError={missingSubmissions ? 'No submissions available to derive example answers yet.' : undefined}
          />
        </>
      )}

      {/* Question Edit Drawer */}
      <Drawer
        opened={!!editingQid}
        onClose={closeEditDrawer}
        position="right"
        size="lg"
        title={editingQid ? `Edit Question: ${editingQid}` : 'Edit Question'}
        styles={{
          content: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
          body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 0 },
        }}
      >
        <Stack gap="md" style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          <Select
            label="Type"
            data={QUESTION_TYPES as unknown as string[]}
            value={drawerType}
            onChange={(v) =>
              setEditingDraft((prev) => ({ ...(prev ?? {}), type: (v ?? 'TEXT') as QuestionDef['type'] }))
            }
          />

          {drawerRootSchema && (
            <Box>
              <SchemaForm<QuestionDef>
                schema={{ ...drawerRootSchema as object, definitions: questionsSchema as Record<string, JSONSchema7Definition> }}
                uiSchema={{
                  'ui:title': '',
                  'ui:options': { label: true },
                  'ui:submitButtonOptions': { norender: true },
                  type: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
                }}
                formData={editingDraft as QuestionDef}
                onChange={({ formData }) => {
                  setEditingDraft((prev) => ({ ...(formData ?? {}), type: prev?.type ?? drawerType } as Partial<QuestionDef>));
                }}
                onSubmit={() => {}}
                formProps={{ noHtml5Validate: true }}
                showSubmit={false}
              />
            </Box>
          )}

          {drawerExamples.length > 0 && (
            <Box>
              <Text size="sm" fw={500} mb={4}>Example answers (read-only)</Text>
              <Stack gap={2}>
                {drawerExamples.slice(0, 10).map((ex, i) => (
                  <Text key={i} ff="monospace" size="xs" c="dimmed">
                    <AnswerText value={String(ex ?? '')} maxLength={80} />
                  </Text>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>

        <Box
          py="md"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
        >
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={closeEditDrawer}>Cancel</Button>
            <Button loading={updateMutation.isPending} onClick={() => void saveEditDrawer()}>Save</Button>
          </Group>
        </Box>
      </Drawer>

      <Modal
        opened={confirmInfer}
        onClose={() => setConfirmInfer(false)}
        title="Replace Questions"
      >
        <Text mb="md">This will replace the existing questions by inferring from current submissions. Proceed?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmInfer(false)}>Cancel</Button>
          <Button
            loading={inferMutation.isPending}
            onClick={() =>
              inferMutation.mutate(undefined, {
                onSuccess: () => {
                  setConfirmInfer(false);
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
          <Alert color="red" mt="sm">{getErrorMessage(inferMutation.error)}</Alert>
        )}
      </Modal>

      <Modal
        opened={confirmDeleteQs}
        onClose={() => setConfirmDeleteQs(false)}
        title="Delete Question Set"
      >
        <Text mb="md">This will delete the stored question set and any parsed examples. Continue?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmDeleteQs(false)}>Cancel</Button>
          <Button
            color="red"
            loading={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(undefined, {
                onSuccess: () => {
                  setConfirmDeleteQs(false);
                  notifications.show({ color: 'green', message: 'Question set deleted' });
                },
                onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
              })
            }
          >
            Delete
          </Button>
        </Group>
        {deleteMutation.isError && (
          <Alert color="red" mt="sm">{getErrorMessage(deleteMutation.error)}</Alert>
        )}
      </Modal>

      {openQsUpload && <QuestionSetUploadModal
        open={openQsUpload}
        assessmentId={safeAssessmentId}
        onClose={() => setOpenQsUpload(false)}
      />}
      {openQsImport && <QuestionSetImportModal
        open={openQsImport}
        assessmentId={safeAssessmentId}
        onClose={() => setOpenQsImport(false)}
      />}
    </Stack>
    </PageShell>
  );
};

export default QuestionsPage;

