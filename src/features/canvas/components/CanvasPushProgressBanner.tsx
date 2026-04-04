import { Alert, Group, Button, Loader } from '@mantine/core';
import React from 'react';

import type { CanvasProgress } from '@api/canvasClient';

type Props = { progress?: CanvasProgress; isPushing?: boolean; onClear?: () => void };

const CanvasPushProgressBanner: React.FC<Props> = ({ progress, isPushing, onClear }) => {
  if (isPushing && !progress) {
    return (
      <Alert color="blue" icon={<Loader size="sm" />}>Submitting grades...</Alert>
    );
  }
  if (!progress) return null;

  const { workflow_state, message } = progress;

  const config: Record<string, { color: string; loading: boolean; text: string }> = {
    completed: { color: 'green', loading: false, text: 'Canvas push completed successfully!' },
    failed: { color: 'red', loading: false, text: `Canvas push failed${message ? `: ${message}` : '.'}` },
    queued: { color: 'blue', loading: true, text: 'Queueing grades update...' },
    running: { color: 'blue', loading: true, text: 'Updating grades...' },
  };

  const cfg = config[workflow_state];
  if (!cfg) return null;

  return (
    <Alert color={cfg.color} icon={cfg.loading ? <Loader size="sm" /> : undefined}>
      <Group justify="space-between">
        <span>{cfg.text}</span>
        {onClear && !cfg.loading && (
          <Button size="xs" variant="subtle" onClick={onClear}>Dismiss</Button>
        )}
      </Group>
    </Alert>
  );
};

export default CanvasPushProgressBanner;
