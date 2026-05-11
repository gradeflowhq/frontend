import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import JobProgressIndicator from './JobProgressIndicator';

import type { ComponentProps } from 'react';

describe('JobProgressIndicator', () => {
  const renderIndicator = (progress: ComponentProps<typeof JobProgressIndicator>['progress']) =>
    render(
      <MantineProvider>
        <JobProgressIndicator progress={progress} />
      </MantineProvider>,
    );

  it('renders determinate progress before reaching 100 percent', () => {
    renderIndicator({ percent: 75, overdue: false, remainingMs: 1_000 });

    const progressbar = screen.getByRole('progressbar', { name: 'Estimated job progress' });

    expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    expect(progressbar).not.toHaveAttribute('data-animated');
    expect(progressbar).not.toHaveAttribute('data-striped');
  });

  it('uses Mantine striped animation at 100 percent', () => {
    renderIndicator({ percent: 100, overdue: false, remainingMs: 0 });

    const progressbar = screen.getByRole('progressbar', { name: 'Estimated job progress' });

    expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    expect(progressbar).toHaveAttribute('data-animated');
    expect(progressbar).toHaveAttribute('data-striped');
  });

  it('keeps Mantine striped animation when progress is overdue', () => {
    renderIndicator({ percent: 100, overdue: true, remainingMs: 0 });

    const progressbar = screen.getByRole('progressbar', { name: 'Estimated job progress' });

    expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    expect(progressbar).toHaveAttribute('data-animated');
    expect(progressbar).toHaveAttribute('data-striped');
  });
});
