import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback, useState } from 'react';

import { api } from '@api';
import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import { QK } from '@api/queryKeys';
import { isActiveJobStatus } from '@features/grading/helpers/jobStatus';
import { useJobProgress } from '@features/grading/hooks/useJobProgress';
import {
  POLLING_INTERVAL_MS,
  CACHE_STALE_TIME_GRADING,
  CACHE_STALE_TIME_JOB,
} from '@lib/constants';

import type {
  GradeAdjustmentRequest,
  BulkGradeAdjustmentRequest,
  GradingPreviewRequest,
} from '@api/models';
import type { JobStatusResponseStatus } from '@api/models/jobStatusResponseStatus';
import type { JobTiming } from '@features/grading/helpers/jobProgress';

export type GradingJobStatus = JobStatusResponseStatus;

// Base results query (always returns last computed results)
export const useGrading = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.grading.item(assessmentId),
    queryFn: async () => {
      try {
        return (await api.getGradingAssessmentsAssessmentIdGradingGet(assessmentId)).data;
      } catch (e: unknown) {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          return null;
        }
        throw e;
      }
    },
    enabled,
    staleTime: CACHE_STALE_TIME_GRADING,
  });

// Read current grading job (points to job status URL)
export const useGradingJob = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: QK.grading.job(assessmentId),
    queryFn: async () => {
      try {
        return (await api.getGradingJobAssessmentsAssessmentIdGradingJobGet(assessmentId)).data;
      } catch (e: unknown) {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          return null;
        }
        throw e;
      }
    },
    enabled,
    // Keep a short cache; we will drive polling via status below
    staleTime: CACHE_STALE_TIME_JOB,
  });

// Poll job status by job_id
export const useJobStatus = (jobId: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: QK.grading.jobStatus(jobId ?? 'none'),
    queryFn: async () => {
      if (!jobId) throw new Error('Missing jobId');
      return (await api.getStatusJobsJobIdGet(jobId)).data;
    },
    enabled: enabled && !!jobId,
    // Poll while running/queued; caller can decide when to stop
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return isActiveJobStatus(status) ? POLLING_INTERVAL_MS : false;
    },
  });

export const useRunGrading = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'run'],
    // Start job (returns GradingJob)
    mutationFn: async (removeAdjustments: boolean = false) =>
      (
        await api.runGradingAssessmentsAssessmentIdGradingPost(assessmentId, {
          remove_adjustments: removeAdjustments,
        })
      ).data,
    onSuccess: async () => {
      // Refresh job and grading queries; results will update when job completes
      await qc.invalidateQueries({ queryKey: QK.grading.job(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
    },
  });
};

export const useCancelGrading = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'cancel'],
    mutationFn: async () =>
      api.cancelGradingJobAssessmentsAssessmentIdGradingJobDelete(assessmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.grading.job(assessmentId) });
    },
  });
};

export const useCancelGradingPreview = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'preview', 'cancel'],
    mutationFn: async () =>
      api.cancelGradingPreviewJobAssessmentsAssessmentIdGradingPreviewJobDelete(assessmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.grading.previewJob(assessmentId) });
    },
  });
};

export const useAdjustGrading = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'adjust'],
    mutationFn: async (payload: GradeAdjustmentRequest) =>
      (await api.adjustGradingAssessmentsAssessmentIdGradingAdjustPost(assessmentId, payload)).data,
    onSuccess: (data) => {
      qc.setQueryData(QK.grading.item(assessmentId), data);
    },
  });
};

export const useBulkAdjustGrading = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['grading', assessmentId, 'bulk-adjust'],
    mutationFn: async (payload: BulkGradeAdjustmentRequest) =>
      (
        await api.bulkAdjustGradingAssessmentsAssessmentIdGradingBulkAdjustPost(
          assessmentId,
          payload,
        )
      ).data,
    onSuccess: (data) => {
      qc.setQueryData(QK.grading.item(assessmentId), data.result);
    },
  });
};

// Preview: start job, poll preview job until completion/failure, then fetch snapshot
export const usePreviewGrading = (assessmentId: string) => {
  const [previewJob, setPreviewJob] = useState<{
    status: GradingJobStatus;
    timing: JobTiming | null;
  } | null>(null);
  const previewStatus = previewJob?.status ?? null;
  const previewProgress = useJobProgress(
    previewJob?.timing,
    isActiveJobStatus(previewStatus),
  );

  const mutation = useMutation({
    mutationKey: ['grading', assessmentId, 'preview'],
    mutationFn: async (payload: GradingPreviewRequest) => {
      setPreviewJob({ status: JobStatus.queued, timing: null });
      try {
        const job = (
          await api.runGradingPreviewAssessmentsAssessmentIdGradingPreviewPost(
            assessmentId,
            payload,
          )
        ).data;

        setPreviewJob({ status: JobStatus.queued, timing: job });

        while (true) {
          const statusRes = await api.getStatusJobsJobIdGet(job.job_id);
          const statusData = statusRes.data;
          const status = statusData.status;
          setPreviewJob({ status, timing: statusData });
          if (status === JobStatus.completed) break;
          if (status === JobStatus.failed) {
            throw new Error(statusData.error ?? 'Preview job failed');
          }
          await new Promise((r) => setTimeout(r, POLLING_INTERVAL_MS));
        }

        const res = await api.getGradingPreviewAssessmentsAssessmentIdGradingPreviewGet(
          assessmentId,
        );
        return res.data;
      } catch (error) {
        setPreviewJob(null);
        throw error;
      }
    },
  });

  const reset = useCallback(() => {
    setPreviewJob(null);
    mutation.reset();
  }, [mutation]);

  return { ...mutation, previewStatus, previewProgress, reset };
};
