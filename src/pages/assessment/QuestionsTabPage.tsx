import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ErrorAlert from '../../components/common/ErrorAlert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import QuestionsHeader from '../../components/questions/QuestionsHeader';
import QuestionsTable from '../../components/questions/QuestionsTable';
import { api } from '../../api';

import type {
  QuestionSetResponse,
  ParseSubmissionsResponse,
  QuestionSetInput,
  SetQuestionSetByModelRequest,
  SubmissionsResponse,
} from '../../api/models';

const QuestionsTabPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const qc = useQueryClient();
  const [confirmInfer, setConfirmInfer] = React.useState(false);

  if (!assessmentId) return null;

  // Raw submissions (to decide whether to show the Infer button)
  const { data: subsRes } = useQuery({
    queryKey: ['submissions', assessmentId],
    queryFn: async () =>
      (await api.getSubmissionsAssessmentsAssessmentIdSubmissionsGet(assessmentId)).data as SubmissionsResponse,
  });
  const hasSubmissions = (subsRes?.raw_submissions?.length ?? 0) > 0;

  // Question set
  const {
    data: qsRes,
    isLoading: loadingQS,
    isError: errorQS,
    error: qsError,
  } = useQuery({
    queryKey: ['questionSet', assessmentId],
    queryFn: async () =>
      (await api.getQuestionSetAssessmentsAssessmentIdQuestionSetGet(assessmentId)).data as QuestionSetResponse,
    enabled: hasSubmissions,
  });

  // Only parse when a question set exists
  const questionMap = qsRes?.question_set?.question_map ?? {};
  const hasQuestionSet = !!qsRes?.question_set && Object.keys(questionMap).length > 0;

  const {
    data: parsedRes,
    isLoading: loadingParsed,
    isError: errorParsed,
    error: parsedError,
  } = useQuery({
    queryKey: ['parsedSubmissions', assessmentId],
    queryFn: async () => {
      const res = await api.parseSubmissionsAssessmentsAssessmentIdQuestionSetParsePost(assessmentId, {
        use_stored_question_set: true,
        use_stored_submissions: true,
      });
      return res.data as ParseSubmissionsResponse;
    },
    enabled: hasQuestionSet,
  });

  // Update question set (manual edits)
  const updateMutation = useMutation({
    mutationKey: ['questionSet', assessmentId, 'update'],
    mutationFn: async (nextQS: QuestionSetInput) => {
      const payload: SetQuestionSetByModelRequest = { question_set: nextQS };
      const res = await api.setQuestionSetByModelAssessmentsAssessmentIdQuestionSetPut(assessmentId, payload);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['questionSet', assessmentId] });
      await qc.invalidateQueries({ queryKey: ['parsedSubmissions', assessmentId] });
    },
  });

  // Infer (replace) questions from submissions, then parse
  const inferMutation = useMutation({
    mutationKey: ['questionSet', assessmentId, 'infer'],
    mutationFn: async () => {
      await api.inferQuestionSetAssessmentsAssessmentIdQuestionSetInferPost(assessmentId, {
        use_stored_submissions: true,
        commit: true,
      });
      await api.parseSubmissionsAssessmentsAssessmentIdQuestionSetParsePost(assessmentId, {
        use_stored_question_set: true,
        use_stored_submissions: true,
      });
    },
    onSuccess: async () => {
      setConfirmInfer(false);
      await qc.invalidateQueries({ queryKey: ['questionSet', assessmentId] });
      await qc.invalidateQueries({ queryKey: ['parsedSubmissions', assessmentId] });
    },
  });

  // Examples from parsed submissions
  const examplesByQuestion = React.useMemo(() => {
    const subs = parsedRes?.submissions ?? [];
    const map: Record<string, string[]> = {};
    subs.slice(0, 50).forEach((sub) => {
      Object.entries(sub.answer_map ?? {}).forEach(([qid, val]) => {
        const value =
          Array.isArray(val)
            ? JSON.stringify(val)
            : typeof val === 'object' && val !== null
            ? JSON.stringify(val)
            : String(val ?? '');
        if (!map[qid]) map[qid] = [];
        if (map[qid].length < 10 && !map[qid].includes(value)) {
          map[qid].push(value);
        }
      });
    });
    return map;
  }, [parsedRes]);

  return (
    <section className="space-y-6">
      {loadingQS && (
        <div className="alert alert-info">
          <span>Loading questions...</span>
        </div>
      )}
      {errorQS && <ErrorAlert error={qsError} />}
      {errorParsed && <ErrorAlert error={parsedError} />}

      {/* Show the Infer button only when there are submissions */}
      <QuestionsHeader onInfer={() => setConfirmInfer(true)} showInfer={hasSubmissions} />

      {!loadingQS && !errorQS && (
        <QuestionsTable
          questionMap={questionMap}
          examplesByQuestion={examplesByQuestion}
          onUpdateQuestionSet={async (next) => {
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
        confirmText={inferMutation.isPending ? 'Inferring...' : 'Proceed'}
        onConfirm={() => inferMutation.mutate()}
        onCancel={() => setConfirmInfer(false)}
      />
      {inferMutation.isError && <ErrorAlert error={inferMutation.error} />}
    </section>
  );
};

export default QuestionsTabPage;