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
} from '@features/questions/hooks';
import { buildExamplesFromParsed } from '@features/questions/helpers';
import { useSubmissions } from '@features/submissions/hooks';
import type { QuestionSetInput } from '@api/models';

const QuestionsTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [confirmInfer, setConfirmInfer] = React.useState(false);

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

  // Infer (replace) questions from submissions, then parse
  const inferMutation = useInferAndParseQuestionSet(assessmentId);

  // Examples from parsed submissions
  const examplesByQuestion = React.useMemo(() => buildExamplesFromParsed(parsedRes), [parsedRes]);

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
        assessmentId={assessmentId}
      />

      {!loadingQS && !errorQS && (
        <QuestionsTable
          questionMap={questionMap}
          examplesByQuestion={examplesByQuestion}
          onUpdateQuestionSet={async (next: QuestionSetInput) => {
            await updateMutation.mutateAsync(next);
          }}
          updating={updateMutation.isPending}
          updateError={updateMutation.isError ? updateMutation.error : null}
        />
      )}

      <ConfirmDialog
        open={confirmInfer}
        title="Replace Questions"
        message="This will replace the existing questions by inferring from current submissions. Proceed?"
        confirmLoading={inferMutation.isPending}
        confirmLoadingLabel="Inferring..."
        confirmText="Proceed"
        onConfirm={() => inferMutation.mutate(undefined, { onSuccess: () => setConfirmInfer(false) })}
        onCancel={() => setConfirmInfer(false)}
      />
      {inferMutation.isError && <ErrorAlert error={inferMutation.error} />}
    </section>
  );
};

export default QuestionsTabPage;