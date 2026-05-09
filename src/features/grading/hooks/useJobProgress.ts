import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { EMPTY_JOB_PROGRESS, getJobProgress } from '@features/grading/helpers/jobProgress';
import { JOB_PROGRESS_UPDATE_INTERVAL_MS } from '@lib/constants';
import { getCurrentTimestampMs } from '@utils/datetime';

import type { JobProgress, JobTiming } from '@features/grading/helpers/jobProgress';

type UseJobProgressOptions = {
  startFromCurrentTime?: boolean;
};

export const useJobProgress = (
  timing: JobTiming | null | undefined,
  enabled: boolean,
  options: UseJobProgressOptions = {},
): JobProgress => {
  const [nowMs, setNowMs] = useState(getCurrentTimestampMs);
  const [visualStartMs, setVisualStartMs] = useState<number | null>(null);
  const [animateAhead, setAnimateAhead] = useState(false);

  const completedAt = timing?.completed_at ?? null;
  const createdAt = timing?.created_at ?? null;
  const estimatedCompletionAt = timing?.estimated_completion_at ?? null;
  const estimatedDurationSeconds = timing?.estimated_duration_seconds ?? null;

  const timingSnapshot = useMemo<JobTiming | null>(() => {
    if (!createdAt) return null;

    return {
      completed_at: completedAt,
      created_at: createdAt,
      estimated_completion_at: estimatedCompletionAt,
      estimated_duration_seconds: estimatedDurationSeconds,
    };
  }, [completedAt, createdAt, estimatedCompletionAt, estimatedDurationSeconds]);

  useEffect(() => {
    if (!enabled) return undefined;

    const intervalId = window.setInterval(() => {
      setNowMs(getCurrentTimestampMs());
    }, JOB_PROGRESS_UPDATE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [enabled]);

  useLayoutEffect(() => {
    const currentMs = getCurrentTimestampMs();
    setNowMs(currentMs);

    if (!enabled) {
      setVisualStartMs(null);
      setAnimateAhead(false);
      return;
    }

    setVisualStartMs(options.startFromCurrentTime ? null : currentMs);

    setAnimateAhead(false);
    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setAnimateAhead(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
    };
  }, [enabled, options.startFromCurrentTime, timingSnapshot]);

  if (!enabled) return EMPTY_JOB_PROGRESS;

  const progressOptions = {
    progressStartMs: options.startFromCurrentTime ? null : visualStartMs,
  };
  const statusProgress = getJobProgress(timingSnapshot, nowMs, progressOptions);
  const transitionMs =
    statusProgress.percent === null || statusProgress.remainingMs === null
      ? 0
      : Math.min(JOB_PROGRESS_UPDATE_INTERVAL_MS, statusProgress.remainingMs);
  const displayProgress =
    animateAhead && transitionMs > 0
      ? getJobProgress(timingSnapshot, nowMs + transitionMs, progressOptions)
      : statusProgress;

  return {
    ...statusProgress,
    percent: displayProgress.percent,
    transitionMs,
  };
};
