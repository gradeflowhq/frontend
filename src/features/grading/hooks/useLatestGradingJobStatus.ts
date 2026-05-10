import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import { useGradingJob, useJobStatus } from '@features/grading/api';
import { isActiveJobStatus, isTerminalJobStatus } from '@features/grading/helpers/jobStatus';

import type { JobStatusResponseStatus } from '@api/models/jobStatusResponseStatus';
import type { JobTiming } from '@features/grading/helpers/jobProgress';

export interface LatestGradingJobStatusResult {
  gradingInProgress: boolean;
  jobStatus: JobStatusResponseStatus | undefined;
  jobError: string | null;
  statusError?: unknown;
  jobTiming: JobTiming | null | undefined;
}

export const useLatestGradingJobStatus = (
  assessmentId: string,
  enabled = true,
): LatestGradingJobStatusResult => {
  const {
    data: gradingJob,
    error: gradingJobError,
    isError: isGradingJobError,
  } = useGradingJob(assessmentId, enabled);

  const jobId = isTerminalJobStatus(gradingJob?.status) ? null : (gradingJob?.job_id ?? null);
  const {
    data: jobStatusRes,
    error: jobStatusError,
    isError: isJobStatusError,
  } = useJobStatus(jobId, enabled && !!jobId);

  const jobStatus = jobStatusRes?.status ?? gradingJob?.status;
  const jobError =
    jobStatus === JobStatus.failed ? (jobStatusRes?.error ?? gradingJob?.error ?? null) : null;
  const gradingInProgress = isActiveJobStatus(jobStatus);
  let statusError: unknown;
  if (isJobStatusError) {
    statusError = jobStatusError;
  } else if (isGradingJobError) {
    statusError = gradingJobError;
  }

  return {
    gradingInProgress,
    jobStatus,
    jobError,
    statusError,
    jobTiming: jobStatusRes ?? gradingJob,
  };
};
