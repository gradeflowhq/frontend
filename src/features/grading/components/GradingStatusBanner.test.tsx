import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
    jobError: undefined,
    isStale: false,
    updatedAt: null,
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
    renderBanner({ gradingInProgress: true, jobStatus: 'queued' });

    expect(screen.getByText(/Grading job queued/)).toBeInTheDocument();
  });

  it('shows failed grading errors as an alert', () => {
    renderBanner({ jobStatus: 'failed', jobError: 'Engine failed on q1' });

    expect(screen.getByText('Grading failed')).toBeInTheDocument();
    expect(screen.getByText('Engine failed on q1')).toBeInTheDocument();
  });
});
