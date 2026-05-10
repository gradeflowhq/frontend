import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import { QK } from '@api/queryKeys';
import { useGrading } from '@features/grading/api';
import { useJobProgress } from '@features/grading/hooks/useJobProgress';
import { useLatestGradingJobStatus } from '@features/grading/hooks/useLatestGradingJobStatus';

import type { JobStatusResponseStatus } from '@api/models/jobStatusResponseStatus';
import type { JobProgress } from '@features/grading/helpers/jobProgress';

export interface GradingStatusResult {
  gradingInProgress: boolean;
  jobStatus: JobStatusResponseStatus | undefined;
  jobError: string | null;
  statusError?: unknown;
  isStale: boolean;
  updatedAt: string | null | undefined;
  jobProgress: JobProgress;
}

/**
 * Composes grading results with the latest job status and auto-invalidates
 * results when a job transitions to "completed".
 */
export const useGradingStatus = (assessmentId: string): GradingStatusResult => {
  const qc = useQueryClient();

  const { data: gradingData } = useGrading(assessmentId, true);
  const {
    gradingInProgress,
    jobStatus,
    jobError,
    statusError,
    jobTiming,
  } = useLatestGradingJobStatus(assessmentId);
  const jobProgress = useJobProgress(jobTiming, gradingInProgress, {
    startFromCurrentTime: true,
  });
  const isStale = gradingData?.status?.is_stale ?? false;
  const updatedAt = gradingData?.status?.updated_at;

  // Auto-invalidate grading results when the job transitions to completed so
  // pages always show fresh data without managing this effect themselves.
  useEffect(() => {
    if (jobStatus === JobStatus.completed) {
      void qc.invalidateQueries({ queryKey: QK.grading.item(assessmentId) });
      void qc.invalidateQueries({ queryKey: QK.grading.job(assessmentId) });
    }
  }, [jobStatus, assessmentId, qc]);

  return {
    gradingInProgress,
    jobStatus,
    jobError,
    statusError,
    isStale,
    updatedAt,
    jobProgress,
  };
};
