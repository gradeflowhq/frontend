import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@api';
import { invalidateQuestionSetQueries } from '@api/queryInvalidation';
import { QK } from '@api/queryKeys';

import type {
  ParseSubmissionsResponse,
  QuestionCreateRequest,
  QuestionCreateRequestQuestion,
  QuestionSetInput,
  QuestionSetResponse,
  QuestionSetStatusResponse,
  QuestionUpdateRequest,
  QuestionUpdateRequestQuestion,
  SetQuestionSetByModelRequest,
} from '@api/models';

export const useQuestionSet = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.questionSet.item(assessmentId),
    queryFn: async () =>
      (await api.getQuestionSetAssessmentsAssessmentIdQuestionSetGet(assessmentId)).data as QuestionSetResponse,
    enabled,
  });

export const useQuestionSetStatus = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.questionSet.status(assessmentId),
    queryFn: async () =>
      (await api.getQuestionSetStatusAssessmentsAssessmentIdQuestionSetStatusGet(assessmentId))
        .data as QuestionSetStatusResponse,
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
    onSuccess: async (_data, nextQS) => {
      qc.setQueryData<QuestionSetResponse | undefined>(
        QK.questionSet.item(assessmentId),
        (current) => {
          if (!current) return current;
          return {
            ...current,
            question_set: nextQS,
          };
        },
      );

      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};

export const useCreateQuestion = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['questionSet', assessmentId, 'question', 'create'],
    mutationFn: async ({
      questionId,
      question,
    }: {
      questionId: string;
      question: QuestionCreateRequestQuestion;
    }) => {
      const payload: QuestionCreateRequest = {
        question_id: questionId,
        question,
      };
      return (
        await api.createQuestionAssessmentsAssessmentIdQuestionSetQuestionsPost(
          assessmentId,
          payload,
        )
      ).data as QuestionSetResponse;
    },
    onSuccess: async (data) => {
      qc.setQueryData(QK.questionSet.item(assessmentId), data);
      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};

export const useUpdateQuestion = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['questionSet', assessmentId, 'question', 'update'],
    mutationFn: async ({
      questionId,
      question,
    }: {
      questionId: string;
      question: QuestionUpdateRequestQuestion;
    }) => {
      const payload: QuestionUpdateRequest = { question };
      return (
        await api.updateQuestionAssessmentsAssessmentIdQuestionSetQuestionsQuestionIdPut(
          assessmentId,
          questionId,
          payload,
        )
      ).data as QuestionSetResponse;
    },
    onSuccess: async (data) => {
      qc.setQueryData(QK.questionSet.item(assessmentId), data);
      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};

export const useDeleteQuestion = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['questionSet', assessmentId, 'question', 'delete'],
    mutationFn: async (questionId: string) => {
      await api.deleteQuestionAssessmentsAssessmentIdQuestionSetQuestionsQuestionIdDelete(
        assessmentId,
        questionId,
      );
    },
    onSuccess: async (_data, questionId) => {
      qc.setQueryData<QuestionSetResponse | undefined>(
        QK.questionSet.item(assessmentId),
        (current) => {
          if (!current) return current;
          const { [questionId]: _removed, ...questionMap } =
            current.question_set.question_map;
          return {
            ...current,
            question_set: {
              ...current.question_set,
              question_map: questionMap,
            },
          };
        },
      );

      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};

export const useDeleteQuestionSet = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['questionSet', assessmentId, 'delete'],
    mutationFn: async () => {
      await api.deleteQuestionSetAssessmentsAssessmentIdQuestionSetDelete(assessmentId);
    },
    onSuccess: async () => {
      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};

export const useSyncQuestionSet = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['questionSet', assessmentId, 'sync'],
    mutationFn: async () =>
      (await api.syncQuestionSetAssessmentsAssessmentIdQuestionSetSyncPost(assessmentId)).data as QuestionSetResponse,
    onSuccess: async (data) => {
      qc.setQueryData(QK.questionSet.item(assessmentId), data);
      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};

export const useAcknowledgeQuestionSetStaleness = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['questionSet', assessmentId, 'acknowledgeStaleness'],
    mutationFn: async () =>
      (
        await api.acknowledgeQuestionSetStalenessAssessmentsAssessmentIdQuestionSetStalenessAcknowledgePost(
          assessmentId,
        )
      ).data as QuestionSetResponse,
    onSuccess: async (data) => {
      qc.setQueryData(QK.questionSet.item(assessmentId), data);
      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};

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
      await invalidateQuestionSetQueries(qc, assessmentId);
    },
  });
};
