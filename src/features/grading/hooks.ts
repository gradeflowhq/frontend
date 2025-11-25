import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type {
  GradingResponse,
  GradeAdjustmentRequest,
  GradingExportRequest,
  GradingExportResponse,
 } from '@api/models';

export const useGrading = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.grading.item(assessmentId),
    queryFn: async () =>
      (await api.getGradingAssessmentsAssessmentIdGradingGet(assessmentId)).data as GradingResponse,
    enabled,
    staleTime: 30_000,
  });

export const useRunGrading = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'run'],
    mutationFn: async () =>
      (await api.runGradingAssessmentsAssessmentIdGradingRunPost(assessmentId, {})).data as GradingResponse,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
    },
  });
};

export const useAdjustGrading = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'adjust'],
    mutationFn: async (payload: GradeAdjustmentRequest) =>
      (await api.adjustGradingAssessmentsAssessmentIdGradingAdjustPost(assessmentId, payload)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
    },
  });
};

export const useExportGrading = (assessmentId: string) =>
  useMutation({
    mutationKey: QK.grading.export(assessmentId),
    mutationFn: async (payload: GradingExportRequest) =>
      (await api.exportGradingAssessmentsAssessmentIdGradingExportPost(assessmentId, payload)).data as GradingExportResponse,
  });