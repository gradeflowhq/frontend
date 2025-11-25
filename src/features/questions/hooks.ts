import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type { QuestionSetResponse, ParseSubmissionsResponse, QuestionSetInput, SetQuestionSetByModelRequest } from '@api/models';

export const useQuestionSet = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.questionSet.item(assessmentId),
    queryFn: async () =>
      (await api.getQuestionSetAssessmentsAssessmentIdQuestionSetGet(assessmentId)).data as QuestionSetResponse,
    enabled,
  });

export const useParsedSubmissions = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.questionSet.parsed(assessmentId),
    queryFn: async () =>
      (await api.parseSubmissionsAssessmentsAssessmentIdQuestionSetParsePost(assessmentId, {
        use_stored_question_set: true,
        use_stored_submissions: true,
      })).data as ParseSubmissionsResponse,
    enabled,
  });

export const useUpdateQuestionSet = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['questionSet', assessmentId, 'update'],
    mutationFn: async (nextQS: QuestionSetInput) => {
      const payload: SetQuestionSetByModelRequest = { question_set: nextQS };
      return (await api.setQuestionSetByModelAssessmentsAssessmentIdQuestionSetPut(assessmentId, payload)).data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.questionSet.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.questionSet.parsed(assessmentId) });
    },
  });
};

// A reusable pipeline: Infer question set then parse submissions
export const useInferAndParseQuestionSet = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
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
      await qc.invalidateQueries({ queryKey: QK.questionSet.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.questionSet.parsed(assessmentId) });
    },
  });
};