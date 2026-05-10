import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import { useGrading, useGradingJob, useJobStatus } from '@features/grading/api';

import { useGradingStatus } from './useGradingStatus';

import type { ReactNode } from 'react';

vi.mock('@features/grading/api', () => ({
  useGrading: vi.fn(),
  useGradingJob: vi.fn(),
  useJobStatus: vi.fn(),
}));

const mockUseGrading = vi.mocked(useGrading);
const mockUseGradingJob = vi.mocked(useGradingJob);
const mockUseJobStatus = vi.mocked(useJobStatus);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
    }
  >
    {children}
  </QueryClientProvider>
);

describe('useGradingStatus', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses persisted completed jobs without polling job status', () => {
    mockUseGrading.mockReturnValue({
      data: { status: { is_stale: false, updated_at: '2026-01-01T00:00:00Z' } },
    } as never);
    mockUseGradingJob.mockReturnValue({
      data: {
        job_id: 'job-1-run',
        url: 'http://test/jobs/job-1-run',
        is_completed: true,
        created_at: '2026-01-01T00:00:00Z',
        completed_at: '2026-01-01T00:00:02Z',
        duration_seconds: 2,
      },
      isError: false,
      error: null,
    } as never);
    mockUseJobStatus.mockReturnValue({ data: undefined, isError: false, error: null } as never);

    const { result } = renderHook(() => useGradingStatus('assessment-1'), { wrapper });

    expect(mockUseJobStatus).toHaveBeenCalledWith(null, false);
    expect(result.current.jobStatus).toBe(JobStatus.completed);
    expect(result.current.statusError).toBeUndefined();
  });
});
