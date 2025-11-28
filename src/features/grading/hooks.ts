import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type {
  GradingResponse,
  GradeAdjustmentRequest,
  GradingExportRequest,
  GradingExportResponse,
  GradingPreviewRequest,
  GradingJob,
  JobStatusResponse,
} from '@api/models';

// Base results query (always returns last computed results)
export const useGrading = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.grading.item(assessmentId),
    queryFn: async () =>
      (await api.getGradingAssessmentsAssessmentIdGradingGet(assessmentId)).data as GradingResponse,
    enabled,
    staleTime: 30_000,
  });

// Read current grading job (points to job status URL)
export const useGradingJob = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.grading.job(assessmentId),
    queryFn: async () =>
      (await api.getGradingJobAssessmentsAssessmentIdGradingJobGet(assessmentId)).data as GradingJob,
    enabled,
    // Keep a short cache; we will drive polling via status below
    staleTime: 5_000,
  });

// Read current preview job (points to job status URL)
export const useGradingPreviewJob = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.grading.previewJob(assessmentId),
    queryFn: async () =>
      (await api.getGradingPreviewJobAssessmentsAssessmentIdGradingPreviewJobGet(assessmentId)).data as GradingJob,
    enabled,
    staleTime: 5_000,
  });

// Poll job status by job_id
export const useJobStatus = (jobId: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: ['jobs', 'status', jobId ?? 'none'],
    queryFn: async () => {
      if (!jobId) throw new Error('Missing jobId');
      return (await api.getStatusJobsJobIdGet(jobId)).data as JobStatusResponse;
    },
    enabled: enabled && !!jobId,
    // Poll while running/queued; caller can decide when to stop
    refetchInterval: (query) => {
      const status = (query.state.data as JobStatusResponse | undefined)?.status;
      return status && (status === 'queued' || status === 'running') ? 2000 : false;
    },
  });

export const useRunGrading = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'run'],
    // Start job (returns GradingJob)
    mutationFn: async () =>
      (await api.runGradingAssessmentsAssessmentIdGradingPost(assessmentId, {})).data as GradingJob,
    onSuccess: async () => {
      // Refresh job and grading queries; results will update when job completes
      await qc.invalidateQueries({ queryKey: QK.grading.job(assessmentId) });
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

// Preview: start job, poll preview job until completion/failure, then fetch snapshot
export const usePreviewGrading = (assessmentId: string) =>
  useMutation({
    mutationKey: ['grading', assessmentId, 'preview'],
    mutationFn: async (payload: GradingPreviewRequest) => {
      // Kick off preview job
      await api.runGradingPreviewAssessmentsAssessmentIdGradingPreviewPost(assessmentId, payload);

      // Poll job status via preview job endpoint
      // Step 1: get latest preview job
      let job: GradingJob | null = null;
      try {
        job = (await api.getGradingPreviewJobAssessmentsAssessmentIdGradingPreviewJobGet(assessmentId)).data as GradingJob;
      } catch {
        // If job info isn't available yet, loop once to allow backend to catch up
      }

      // Poll by job_id if available, else finish optimistically
      if (job?.job_id) {
        // Simple polling loop (2s interval, max ~60s)
        const deadline = Date.now() + 60_000;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const statusRes = await api.getStatusJobsJobIdGet(job.job_id);
          const status = statusRes.data.status;
          if (status === 'completed') break;
          if (status === 'failed') {
            throw new Error('Preview job failed');
          }
          if (Date.now() > deadline) {
            throw new Error('Preview polling timed out');
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      // Fetch preview snapshot for UI
      const res = await api.getGradingPreviewAssessmentsAssessmentIdGradingPreviewGet(assessmentId);
      return res.data as GradingResponse;
    },
  });