import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { EMPTY_JOB_PROGRESS, getJobProgress } from '@features/grading/helpers/jobProgress';
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

  const finishedAt = timing?.finished_at ?? null;
  const createdAt = timing?.created_at ?? null;
  const estimatedCompletionAt = timing?.estimated_completion_at ?? null;
  const estimatedDurationSeconds = timing?.estimated_duration_seconds ?? null;

  const timingSnapshot = useMemo<JobTiming | null>(() => {
    if (!createdAt) return null;

    return {
      finished_at: finishedAt,
      created_at: createdAt,
      estimated_completion_at: estimatedCompletionAt,
      estimated_duration_seconds: estimatedDurationSeconds,
    };
  }, [finishedAt, createdAt, estimatedCompletionAt, estimatedDurationSeconds]);

  useEffect(() => {
    if (!enabled) return undefined;

    let frameId: number;
    const update = () => {
      setNowMs(getCurrentTimestampMs());
      frameId = window.requestAnimationFrame(update);
    };

    frameId = window.requestAnimationFrame(update);

    return () => window.cancelAnimationFrame(frameId);
  }, [enabled]);

  useLayoutEffect(() => {
    const currentMs = getCurrentTimestampMs();
    setNowMs(currentMs);

    if (!enabled) {
      setVisualStartMs(null);
      return;
    }

    setVisualStartMs(options.startFromCurrentTime ? null : currentMs);
  }, [enabled, options.startFromCurrentTime, timingSnapshot]);

  if (!enabled) return EMPTY_JOB_PROGRESS;

  const progressOptions = {
    progressStartMs: options.startFromCurrentTime ? null : visualStartMs,
  };
  const statusProgress = getJobProgress(timingSnapshot, nowMs, progressOptions);

  return {
    ...statusProgress,
    transitionMs: 0,
  };
};
