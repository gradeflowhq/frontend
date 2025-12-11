import React from 'react';
import { useParams } from 'react-router-dom';

import ConfirmDialog from '@components/common/ConfirmDialog';
import ErrorAlert from '@components/common/ErrorAlert';
import TableSkeleton from '@components/common/TableSkeleton';
import { useToast } from '@components/common/ToastProvider';
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
  const toast = useToast();

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
    <section className="space-y-6">
      {errorQS && !qsMissing && <ErrorAlert error={qsError} />}
      {errorParsed && !missingSubmissions && <ErrorAlert error={parsedError} />}

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
        <TableSkeleton cols={5} rows={5} />
      ) : (
        <QuestionsTable
          questionMap={questionMap}
          examplesByQuestion={examplesByQuestion}
          onUpdateQuestionSet={async (next: QuestionSetInput) => {
            await updateMutation.mutateAsync(next, {
              onSuccess: () => toast.success('Question set saved'),
              onError: () => toast.error('Save failed'),
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

      <ConfirmDialog
        open={confirmInfer}
        title="Replace Questions"
        message="This will replace the existing questions by inferring from current submissions. Proceed?"
        confirmLoading={inferMutation.isPending}
        confirmLoadingLabel="Inferring..."
        confirmText="Proceed"
        onConfirm={() =>
          inferMutation.mutate(undefined, {
            onSuccess: () => {
              setConfirmInfer(false);
              toast.success('Questions inferred from submissions');
            },
            onError: () => toast.error('Inference failed'),
          })
        }
        onCancel={() => setConfirmInfer(false)}
      />
      {inferMutation.isError && <ErrorAlert error={inferMutation.error} />}

      <ConfirmDialog
        open={confirmDeleteQs}
        title="Delete Question Set"
        message="This will delete the stored question set and any parsed examples. Continue?"
        confirmText="Delete"
        confirmLoading={deleteMutation.isPending}
        confirmLoadingLabel="Deleting..."
        onConfirm={() =>
          deleteMutation.mutate(undefined, {
            onSuccess: () => {
              setConfirmDeleteQs(false);
              toast.success('Question set deleted');
            },
            onError: () => toast.error('Delete failed'),
          })
        }
        onCancel={() => setConfirmDeleteQs(false)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} />}

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
    </section>
  );
};

export default QuestionsTabPage;