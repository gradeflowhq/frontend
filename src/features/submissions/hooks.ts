import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type { SubmissionsResponse } from '@api/models';

/**
 * Fetch raw submissions for an assessment.
 */
export const useSubmissions = (assessmentId: string) =>
  useQuery({
    queryKey: QK.submissions.list(assessmentId),
    queryFn: async () =>
      (await api.getSubmissionsAssessmentsAssessmentIdSubmissionsGet(assessmentId)).data as SubmissionsResponse,
  });

/**
 * Delete all submissions for an assessment.
 * Invalidates the submissions list on success.
 */
export const useDeleteSubmissions = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['submissions', assessmentId, 'delete'],
    mutationFn: async () => (await api.deleteSubmissionsAssessmentsAssessmentIdSubmissionsDelete(assessmentId)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.submissions.list(assessmentId) });
    },
  });
};