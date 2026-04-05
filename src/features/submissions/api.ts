import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@api';
import { QK } from '@api/queryKeys';

import type { SubmissionsImportConfig, SubmissionsResponse } from '@api/models';

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
      // Backend delete clears source data, config, and submissions together
      await qc.invalidateQueries({ queryKey: QK.submissions.list(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.submissions.source(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.submissions.config(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.assessments.item(assessmentId) });
    },
  });
};

/**
 * Fetch the stored source data preview (headers + sample rows + student_id_column).
 */
export const useSourceData = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.submissions.source(assessmentId),
    queryFn: async () =>
      (await api.getSourceDataAssessmentsAssessmentIdSubmissionsSourceGet(assessmentId)).data,
    enabled,
    retry: false, // 404 = no source uploaded yet; don't retry
  });

/**
 * Fetch the stored import config (answer_columns, point_columns).
 */
export const useImportConfig = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.submissions.config(assessmentId),
    queryFn: async () =>
      (await api.getImportConfigAssessmentsAssessmentIdSubmissionsConfigGet(assessmentId)).data,
    enabled,
    retry: false, // 404 = no config saved yet; don't retry
  });

/**
 * Persist the import config (answer_columns + point_columns) so user can reconfigure later.
 * Submissions are derived on-the-fly from source data + config, so invalidate the list too.
 */
export const useSaveImportConfig = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['submissions', assessmentId, 'save-config'],
    mutationFn: async (config: SubmissionsImportConfig) =>
      (await api.saveImportConfigAssessmentsAssessmentIdSubmissionsConfigPut(assessmentId, config)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.submissions.config(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.submissions.list(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.assessments.item(assessmentId) });
    },
  });
};
