import { describe, expect, it } from 'vitest';

import {
  getJobProgress,
  getJobProgressText,
  isJobProgressIndeterminate,
} from '@features/grading/helpers/jobProgress';
import { getTimestampMs } from '@utils/datetime';

describe('jobProgress', () => {
  const createdAt = '2026-05-09T10:00:00.000Z';
  const createdMs = getTimestampMs(createdAt) ?? 0;

  it('calculates progress from the estimated completion time', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_completion_at: '2026-05-09T10:02:00.000Z',
      },
      createdMs + 60_000,
      { overdueDelayMs: 2_000 },
    );

    expect(progress.percent).toBeCloseTo(50);
    expect(progress.overdue).toBe(false);
    expect(progress.remainingMs).toBe(60_000);
  });

  it('can calculate progress from a start time that already includes elapsed time', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_completion_at: '2026-05-09T10:02:00.000Z',
      },
      createdMs + 75_000,
      { overdueDelayMs: 2_000, progressStartMs: createdMs + 60_000 },
    );

    expect(progress.percent).toBeCloseTo(25);
    expect(progress.overdue).toBe(false);
    expect(progress.remainingMs).toBe(45_000);
  });

  it('does not add overdue delay to remaining time', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_duration_seconds: 30,
      },
      createdMs + 29_000,
      { overdueDelayMs: 2_000 },
    );

    expect(progress.percent).toBeCloseTo((29_000 / 30_000) * 100);
    expect(progress.overdue).toBe(false);
    expect(progress.remainingMs).toBe(1_000);
  });

  it('does not mark jobs overdue until the overdue delay has elapsed', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_duration_seconds: 30,
      },
      createdMs + 31_000,
      { overdueDelayMs: 2_000 },
    );

    expect(progress.percent).toBe(100);
    expect(progress.overdue).toBe(false);
    expect(isJobProgressIndeterminate(progress)).toBe(true);
    expect(getJobProgressText(progress, 'Taking longer than expected')).toBe('Finishing...');
    expect(progress.remainingMs).toBe(0);
  });

  it('marks running jobs as overdue after the overdue delay passes', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_duration_seconds: 30,
      },
      createdMs + 45_000,
      { overdueDelayMs: 2_000 },
    );

    expect(progress.percent).toBe(100);
    expect(progress.overdue).toBe(true);
    expect(isJobProgressIndeterminate(progress)).toBe(true);
    expect(getJobProgressText(progress, 'Taking longer than expected')).toBe(
      'Taking longer than expected',
    );
    expect(progress.remainingMs).toBe(0);
  });
});
