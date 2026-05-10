import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PushProgressBanner from './PushProgressBanner';

import type { CanvasProgress } from '@api/canvasClient';

describe('PushProgressBanner', () => {
  it('shows Canvas progress failure messages', () => {
    render(
      <MantineProvider>
        <PushProgressBanner
          progress={{
            id: 1,
            context_id: 1,
            context_type: 'Course',
            user_id: 1,
            tag: 'submissions_update',
            completion: 100,
            workflow_state: 'failed',
            created_at: '2026-05-10T00:00:00Z',
            updated_at: '2026-05-10T00:00:01Z',
            message: 'You do not have permission to manage grades in this course.',
            url: 'https://canvas.example.edu/api/v1/progress/1',
          } satisfies CanvasProgress}
        />
      </MantineProvider>
    );

    expect(screen.getByText(
      'Canvas push failed: You do not have permission to manage grades in this course.'
    )).toBeInTheDocument();
  });
});
