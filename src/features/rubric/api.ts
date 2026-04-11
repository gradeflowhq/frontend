import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { api } from '@api';
import { invalidateRubricQueries } from '@api/queryInvalidation';
import { QK } from '@api/queryKeys';

import type { RubricResponse, CoverageResponse } from '@api/models';

export const useRubric = (assessmentId: string) =>
  useQuery({
    queryKey: QK.rubric.item(assessmentId),
    queryFn: async () => {
      try {
        return (await api.getRubricAssessmentsAssessmentIdRubricGet(assessmentId)).data as RubricResponse;
      } catch (e: unknown) {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          return null;
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

export const useDeleteRubric = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['rubric', assessmentId, 'delete'],
    mutationFn: async () => {
      await api.deleteRubricAssessmentsAssessmentIdRubricDelete(assessmentId);
    },
    onSuccess: async () => {
      await invalidateRubricQueries(qc, assessmentId);
    },
  });
};