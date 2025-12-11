import React from 'react';
import { useParams } from 'react-router-dom';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';
import { QuestionsHeader, QuestionsTable } from '@features/questions/components';
import {
  useQuestionSet,
  useParsedSubmissions,
  useUpdateQuestionSet,
  useInferAndParseQuestionSet,
  useDeleteQuestionSet,
} from '@features/questions/hooks';
import { buildExamplesFromParsed } from '@features/questions/helpers';
import { useSubmissions } from '@features/submissions/hooks';
import type { QuestionSetInput } from '@api/models';
import QuestionSetUploadModal from '@features/questions/components/QuestionSetUploadModal';
import QuestionSetImportModal from '@features/questions/components/QuestionSetImportModal';
import { useToast } from '@components/common/ToastProvider';

const QuestionsTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [confirmInfer, setConfirmInfer] = React.useState(false);
  const [confirmDeleteQs, setConfirmDeleteQs] = React.useState(false);
  const [openQsUpload, setOpenQsUpload] = React.useState(false);
  const [openQsImport, setOpenQsImport] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const toast = useToast();

  if (!assessmentId) return null;

  // Raw submissions (to decide whether to show the Infer button)
  const { data: subsRes } = useSubmissions(assessmentId);
  const hasSubmissions = (subsRes?.raw_submissions?.length ?? 0) > 0;

  // Question set
  const {
    data: qsRes,
    isLoading: loadingQS,
    isError: errorQS,
    error: qsError,
  } = useQuestionSet(assessmentId, true);

  const questionMap = qsRes?.question_set?.question_map ?? {};
  const hasQuestionSet = !!qsRes?.question_set && Object.keys(questionMap).length > 0;

  // Parsed submissions (examples)
  const {
    data: parsedRes,
    isLoading: loadingParsed,
    isError: errorParsed,
    error: parsedError,
  } = useParsedSubmissions(assessmentId, hasQuestionSet);

  // Update question set (manual edits)
  const updateMutation = useUpdateQuestionSet(assessmentId);

  // Delete question set
  const deleteMutation = useDeleteQuestionSet(assessmentId);

  // Infer (replace) questions from submissions, then parse
  const inferMutation = useInferAndParseQuestionSet(assessmentId);

  // Examples from parsed submissions
  const examplesByQuestion = React.useMemo<Record<string, string[]>>(
    () => buildExamplesFromParsed(parsedRes) as Record<string, string[]>,
    [parsedRes]
  );

  return (
    <section className="space-y-6">
      {loadingQS && (
        <div className="alert alert-info">
          <span>Loading questions...</span>
        </div>
      )}
      {errorQS && <ErrorAlert error={qsError} />}
      {loadingParsed && (
        <div className="alert alert-info">
          <span>Parsing submissions...</span>
        </div>
      )}
      {errorParsed && <ErrorAlert error={parsedError} />}

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

      {!loadingQS && !errorQS && (
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
        assessmentId={assessmentId}
        onClose={() => setOpenQsUpload(false)}
      />}
      {openQsImport && <QuestionSetImportModal
        open={openQsImport}
        assessmentId={assessmentId}
        onClose={() => setOpenQsImport(false)}
      />}
    </section>
  );
};

export default QuestionsTabPage;