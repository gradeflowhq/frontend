import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type { RubricResponse, CoverageResponse, RubricOutput, SetRubricByModelRequest } from '@api/models';

export const useRubric = (assessmentId: string) =>
  useQuery({
    queryKey: QK.rubric.item(assessmentId),
    queryFn: async () => {
      try {
        return (await api.getRubricAssessmentsAssessmentIdRubricGet(assessmentId)).data as RubricResponse;
      } catch (e: any) {
        if (e?.response?.status === 404) {
          const created = await api.setRubricByModelAssessmentsAssessmentIdRubricPut(assessmentId, { rubric: { rules: [] } });
          return created.data as RubricResponse;
        }
        throw e;
      }
    },
  });

export const useRubricCoverage = (assessmentId: string) =>
  useQuery({
    queryKey: QK.rubric.coverage(assessmentId),
    queryFn: async () =>
      (await api.rubricCoverageAssessmentsAssessmentIdRubricCoveragePost(assessmentId, {
        use_stored_rubric: true,
        use_stored_question_set: true,
      })).data as CoverageResponse,
  });

export const useReplaceRubric = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['rubric', assessmentId, 'setByModel'],
    mutationFn: async (nextRubric: RubricOutput) => {
      const payload: SetRubricByModelRequest = { rubric: nextRubric };
      return (await api.setRubricByModelAssessmentsAssessmentIdRubricPut(assessmentId, payload)).data as RubricResponse;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
    },
  });
};

export const useDeleteRubric = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['rubric', assessmentId, 'delete'],
    mutationFn: async () => {
      await api.deleteRubricAssessmentsAssessmentIdRubricDelete(assessmentId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
    },
  });
};