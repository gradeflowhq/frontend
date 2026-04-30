import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { QK } from '@api/queryKeys';
import { useGrading, useGradingJob, useJobStatus } from '@features/grading/api';

import type { JobStatusResponse } from '@api/models';

export interface GradingStatusResult {
  gradingInProgress: boolean;
  jobStatus: JobStatusResponse['status'] | undefined;
  jobError: string | null | undefined;
  statusError?: unknown;
  isStale: boolean;
  updatedAt: string | null | undefined;
}

/**
 * Composes useGradingJob + useJobStatus + useGrading into a single hook that
 * returns grading status fields and auto-invalidates the grading query when
 * a job transitions to "completed".
 */
export const useGradingStatus = (assessmentId: string): GradingStatusResult => {
  const qc = useQueryClient();

  const { data: gradingData } = useGrading(assessmentId, true);
  const {
    data: gradingJob,
    error: gradingJobError,
    isError: isGradingJobError,
  } = useGradingJob(assessmentId, true);

  const jobId = gradingJob?.job_id ?? null;
  const {
    data: jobStatusRes,
    error: jobStatusError,
    isError: isJobStatusError,
  } = useJobStatus(jobId, !!jobId);

  const jobStatus = jobStatusRes?.status;
  const jobError = jobStatusRes?.error;
  const gradingInProgress = jobStatus === 'queued' || jobStatus === 'running';
  const isStale = gradingData?.status?.is_stale ?? false;
  const updatedAt = gradingData?.status?.updated_at;
  let statusError: unknown;
  if (isJobStatusError) {
    statusError = jobStatusError;
  } else if (isGradingJobError) {
    statusError = gradingJobError;  // 404s are already caught — any remaining error is real
  }

  // Auto-invalidate grading results when the job transitions to completed so
  // pages always show fresh data without managing this effect themselves.
  useEffect(() => {
    if (jobStatus === 'completed') {
      void qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
      void qc.invalidateQueries({ queryKey: QK.grading.job(assessmentId) });
    }
  }, [jobStatus, assessmentId, qc]);

  return { gradingInProgress, jobStatus, jobError, statusError, isStale, updatedAt };
};
