import { Alert, Modal, Text, Group, Button, Skeleton, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import React from 'react';
import { useParams } from 'react-router-dom';


import { QuestionsHeader, QuestionsTable } from '@features/questions/components';
import QuestionSetImportModal from '@features/questions/components/QuestionSetImportModal';
import QuestionSetUploadModal from '@features/questions/components/QuestionSetUploadModal';
import { buildExamplesFromParsed } from '@features/questions/helpers';
import {
  useQuestionSet,
  useParsedSubmissions,
  useUpdateQuestionSet,
  useInferAndParseQuestionSet,
  useDeleteQuestionSet,
} from '@features/questions/hooks';
import { useSubmissions } from '@features/submissions/hooks';
import { getErrorMessages } from '@utils/error';

import type { QuestionSetInput } from '@api/models';

const QuestionsTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const safeAssessmentId = assessmentId ?? '';
  const enabled = Boolean(assessmentId);
  const [confirmInfer, setConfirmInfer] = React.useState(false);
  const [confirmDeleteQs, setConfirmDeleteQs] = React.useState(false);
  const [openQsUpload, setOpenQsUpload] = React.useState(false);
  const [openQsImport, setOpenQsImport] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

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

  return (
    <Stack gap="md">
      {errorQS && !qsMissing && (
        <Alert color="red">{getErrorMessages(qsError).join(' ')}</Alert>
      )}
      {errorParsed && !missingSubmissions && (
        <Alert color="red">{getErrorMessages(parsedError).join(' ')}</Alert>
      )}

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

      {loadingQS ? (
        <Stack gap="xs">
          <Skeleton height={40} />
          <Skeleton height={200} />
        </Stack>
      ) : (
        <QuestionsTable
          questionMap={questionMap}
          examplesByQuestion={examplesByQuestion}
          onUpdateQuestionSet={async (next: QuestionSetInput) => {
            await updateMutation.mutateAsync(next, {
              onSuccess: () => notifications.show({ color: 'green', message: 'Question set saved' }),
              onError: () => notifications.show({ color: 'red', message: 'Save failed' }),
            });
          }}
          updating={updateMutation.isPending}
          updateError={updateMutation.isError ? updateMutation.error : null}
          searchQuery={searchQuery}
          loadingQuestions={loadingQS}
          loadingExamples={loadingParsed}
          examplesError={missingSubmissions ? 'No submissions available to derive example answers yet.' : undefined}
        />
      )}

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
          <Alert color="red" mt="sm">{getErrorMessages(inferMutation.error).join(' ')}</Alert>
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
          <Alert color="red" mt="sm">{getErrorMessages(deleteMutation.error).join(' ')}</Alert>
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
  );
};

export default QuestionsTabPage;
