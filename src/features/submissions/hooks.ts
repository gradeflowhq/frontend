import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type { SubmissionsResponse, SetSubmissionsByDataRequest } from '@api/models';

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
 * Upload submissions via CSV (client provides CSV string).
 * Invalidates the submissions list on success.
 */
export const useLoadSubmissionsCSV = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['submissions', assessmentId, 'load'],
    mutationFn: async (csv: string) => {
      const payload: SetSubmissionsByDataRequest = {
        data: csv,
        loader_name: 'CSV',
        loader_kwargs: {},
      };
      return (await api.setSubmissionsByDataAssessmentsAssessmentIdSubmissionsLoadPut(assessmentId, payload))
        .data as SubmissionsResponse;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.submissions.list(assessmentId) });
    },
  });
};

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