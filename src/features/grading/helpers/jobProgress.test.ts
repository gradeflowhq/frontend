import { describe, expect, it } from 'vitest';

import {
  getJobProgress,
} from '@features/grading/helpers/jobProgress';
import { getTimestampMs } from '@utils/datetime';

describe('jobProgress', () => {
  const createdAt = '2026-05-09T10:00:00.000Z';
  const createdMs = getTimestampMs(createdAt) ?? 0;

  it('calculates progress from estimated completion plus polling delay', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_completion_at: '2026-05-09T10:02:00.000Z',
      },
      createdMs + 60_000,
      { pollingDelayMs: 2_000 },
    );

    expect(progress.percent).toBeCloseTo((60_000 / 122_000) * 100);
    expect(progress.overdue).toBe(false);
    expect(progress.remainingMs).toBe(62_000);
  });

  it('can calculate progress from a start time that already includes elapsed time', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_completion_at: '2026-05-09T10:02:00.000Z',
      },
      createdMs + 75_000,
      { pollingDelayMs: 2_000, progressStartMs: createdMs + 60_000 },
    );

    expect(progress.percent).toBeCloseTo((15_000 / 62_000) * 100);
    expect(progress.overdue).toBe(false);
    expect(progress.remainingMs).toBe(47_000);
  });

  it('does not mark jobs overdue until the polling delay has elapsed', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_duration_seconds: 30,
      },
      createdMs + 31_000,
      { pollingDelayMs: 2_000 },
    );

    expect(progress.percent).toBeCloseTo((31_000 / 32_000) * 100);
    expect(progress.overdue).toBe(false);
    expect(progress.remainingMs).toBe(1_000);
  });

  it('marks running jobs as overdue after the estimate passes', () => {
    const progress = getJobProgress(
      {
        created_at: createdAt,
        estimated_duration_seconds: 30,
      },
      createdMs + 45_000,
      { pollingDelayMs: 2_000 },
    );

    expect(progress.percent).toBe(100);
    expect(progress.overdue).toBe(true);
    expect(progress.remainingMs).toBe(0);
  });
});
