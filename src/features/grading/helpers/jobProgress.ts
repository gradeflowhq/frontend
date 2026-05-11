import { JOB_PROGRESS_OVERDUE_DELAY_MS } from '@lib/constants';
import { formatDuration, getCurrentTimestampMs, getTimestampMs, secondsToMs } from '@utils/datetime';

import type { GradingJob, JobStatusResponse } from '@api/models';

export type JobTiming = Pick<
  GradingJob | JobStatusResponse,
  'finished_at' | 'created_at' | 'estimated_completion_at' | 'estimated_duration_seconds'
>;

export type JobProgress = {
  percent: number | null;
  transitionMs?: number;
  overdue: boolean;
  remainingMs: number | null;
};

type JobProgressOptions = {
  overdueDelayMs?: number;
  progressStartMs?: number | null;
};

export const EMPTY_JOB_PROGRESS: JobProgress = {
  percent: null,
  transitionMs: 0,
  overdue: false,
  remainingMs: null,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const getEstimatedCompletionMs = (job: JobTiming | null | undefined): number | null => {
  if (!job) return null;

  const explicitEstimate = getTimestampMs(job.estimated_completion_at);
  if (explicitEstimate !== null) return explicitEstimate;

  const createdMs = getTimestampMs(job.created_at);
  const durationMs = secondsToMs(job.estimated_duration_seconds);
  return createdMs !== null && durationMs !== null ? createdMs + durationMs : null;
};

export const getJobProgress = (
  job: JobTiming | null | undefined,
  nowMs = getCurrentTimestampMs(),
  options: JobProgressOptions = {},
): JobProgress => {
  const createdMs = getTimestampMs(job?.created_at);
  const expectedMs = getEstimatedCompletionMs(job);

  if (createdMs === null || expectedMs === null || expectedMs <= createdMs) {
    return EMPTY_JOB_PROGRESS;
  }

  const overdueDelayMs = options.overdueDelayMs ?? JOB_PROGRESS_OVERDUE_DELAY_MS;
  const overdueAtMs = expectedMs + overdueDelayMs;
  const finishedMs = getTimestampMs(job?.finished_at);
  const currentMs = finishedMs ?? nowMs;
  const progressStartMs = options.progressStartMs ?? createdMs;
  const expectedDurationMs = expectedMs - progressStartMs;

  if (expectedDurationMs <= 0) {
    return {
      percent: 100,
      overdue: finishedMs === null && nowMs >= overdueAtMs,
      remainingMs: 0,
    };
  }

  const elapsedMs = Math.max(0, currentMs - progressStartMs);
  const percent = clamp((elapsedMs / expectedDurationMs) * 100, 0, 100);

  return {
    percent,
    overdue: finishedMs === null && nowMs >= overdueAtMs,
    remainingMs: finishedMs === null ? Math.max(0, expectedMs - nowMs) : 0,
  };
};

export const isJobProgressIndeterminate = (progress: JobProgress): boolean =>
  progress.percent !== null && progress.percent >= 100;

export const getJobProgressText = (
  progress: JobProgress,
  overdueMessage: string,
): string | null => {
  if (progress.percent === null) return null;

  return progress.overdue
    ? overdueMessage
    : isJobProgressIndeterminate(progress)
      ? 'Finishing...'
      : `${formatDuration(progress.remainingMs ?? 0)} remaining`;
};
