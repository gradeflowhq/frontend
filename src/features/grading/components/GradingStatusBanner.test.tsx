import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import { EMPTY_JOB_PROGRESS } from '@features/grading/helpers/jobProgress';
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';

import GradingStatusBanner from './GradingStatusBanner';

import type { GradingStatusResult } from '@features/grading/hooks/useGradingStatus';

vi.mock('@features/grading/hooks/useGradingStatus', () => ({
  useGradingStatus: vi.fn(),
}));

const mockUseGradingStatus = vi.mocked(useGradingStatus);

const renderBanner = (overrides: Partial<GradingStatusResult>) => {
  mockUseGradingStatus.mockReturnValue({
    gradingInProgress: false,
    jobStatus: undefined,
    jobError: null,
    isStale: false,
    updatedAt: null,
    jobProgress: EMPTY_JOB_PROGRESS,
    ...overrides,
  });

  return render(
    <MantineProvider>
      <GradingStatusBanner assessmentId="assessment-1" />
    </MantineProvider>,
  );
};

describe('GradingStatusBanner', () => {
  it('shows queued grading status', () => {
    renderBanner({ gradingInProgress: true, jobStatus: JobStatus.queued });

    expect(screen.getByText(/Grading job queued/)).toBeInTheDocument();
  });

  it('shows when grading takes longer than expected', () => {
    renderBanner({
      gradingInProgress: true,
      jobStatus: JobStatus.running,
      jobProgress: { percent: 100, overdue: true, remainingMs: 0 },
    });

    expect(screen.getByText(/Taking longer than expected/)).toBeInTheDocument();
  });

  it('shows finishing text instead of zero seconds at the estimate', () => {
    renderBanner({
      gradingInProgress: true,
      jobStatus: JobStatus.running,
      jobProgress: { percent: 100, overdue: false, remainingMs: 0 },
    });

    expect(screen.getByText('Finishing...')).toBeInTheDocument();
    expect(screen.queryByText(/0 sec remaining/)).not.toBeInTheDocument();
  });

  it('shows failed grading errors as an alert', () => {
    renderBanner({ jobStatus: JobStatus.failed, jobError: 'Engine failed on q1' });

    expect(screen.getByText('Grading failed')).toBeInTheDocument();
    expect(screen.getByText('Engine failed on q1')).toBeInTheDocument();
  });
});
