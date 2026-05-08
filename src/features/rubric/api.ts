import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { api } from '@api';
import { invalidateRubricQueries } from '@api/queryInvalidation';
import { QK } from '@api/queryKeys';
import { getErrorInfo } from '@utils/error';

import type { RubricOverviewResponse } from '@api/models';

export const isMissingStoredRubricError = (error: unknown): boolean => {
  const info = getErrorInfo(error);
  return (
    info.status === 404 &&
    info.code === 'NOT_FOUND' &&
    info.messages.includes('Rubric not set')
  );
};

export const useRubricOverview = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.rubric.overview(assessmentId),
    enabled,
    queryFn: async () => {
      try {
        return (await api.rubricOverviewAssessmentsAssessmentIdRubricOverviewGet(assessmentId))
          .data as RubricOverviewResponse;
      } catch (e: unknown) {
        if (axios.isAxiosError(e) && isMissingStoredRubricError(e)) {
          return null;
        }
        throw e;
      }
    },
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

export const useSyncRubric = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rubric', assessmentId, 'sync'],
    mutationFn: async () =>
      (await api.syncRubricAssessmentsAssessmentIdRubricSyncPost(assessmentId)).data,
    onSuccess: async () => {
      await invalidateRubricQueries(qc, assessmentId);
    },
  });
};

export const useAcknowledgeRubricStaleness = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rubric', assessmentId, 'acknowledgeStaleness'],
    mutationFn: async () => {
      await api.acknowledgeRubricStalenessAssessmentsAssessmentIdRubricStalenessAcknowledgePost(
        assessmentId
      );
    },
    onSuccess: async () => {
      await invalidateRubricQueries(qc, assessmentId);
    },
  });
};

export const useCreateEmptyRubric = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rubric', assessmentId, 'createEmpty'],
    mutationFn: async () => {
      await api.createEmptyRubricAssessmentsAssessmentIdRubricEmptyPost(assessmentId);
    },
    onSettled: async () => {
      await invalidateRubricQueries(qc, assessmentId);
    },
  });
};
