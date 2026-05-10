import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';

import type { JobStatusResponseStatus } from '@api/models/jobStatusResponseStatus';

export const isActiveJobStatus = (status: JobStatusResponseStatus | null | undefined): boolean =>
  status === JobStatus.queued || status === JobStatus.running;

export const isTerminalJobStatus = (status: JobStatusResponseStatus | null | undefined): boolean =>
  status === JobStatus.completed || status === JobStatus.failed;
