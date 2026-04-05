import { useQuery } from '@tanstack/react-query';

import { createCanvasClient } from '@api/canvasClient';

import type { CanvasProgress } from '@api/canvasClient';

export const useCanvasProgress = (
  canvasBaseUrl: string,
  canvasToken: string,
  progressUrl: string | null | undefined,
  enabled = true
) =>
  useQuery({
    queryKey: ['canvas', 'progress', progressUrl ?? 'none'],
    queryFn: async () => {
      if (!progressUrl) throw new Error('Missing progress URL');
      const client = createCanvasClient({ canvasBaseUrl, token: canvasToken });
      return (await client.getProgress(progressUrl)).data as CanvasProgress;
    },
    enabled: enabled && !!progressUrl && !!canvasBaseUrl && !!canvasToken,
    // Poll while running/queued
    refetchInterval: (query) => {
      const progress = query.state.data as CanvasProgress | undefined;
      const state = progress?.workflow_state;
      return state && (state === 'queued' || state === 'running') ? 2000 : false;
    },
    retry: false,
  });
