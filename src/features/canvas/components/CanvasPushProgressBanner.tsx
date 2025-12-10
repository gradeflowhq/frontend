import React from 'react';

import type { CanvasProgress } from '@api/canvasClient';

type CanvasPushProgressBannerProps = {
  progress?: CanvasProgress;
  isPushing?: boolean;
  onClear?: () => void;
};

const CanvasPushProgressBanner: React.FC<CanvasPushProgressBannerProps> = ({ progress, isPushing, onClear }) => {
  // Show initial pushing state before progress data arrives
  if (isPushing && !progress) {
    return (
      <div className="alert alert-info">
        <span className="loading loading-spinner loading-sm"></span>
        <span>Submitting grades...</span>
      </div>
    );
  }

  if (!progress) return null;

  const { workflow_state, message } = progress;

  // Completed state
  if (workflow_state === 'completed') {
    return (
      <div className="alert alert-success">
        <span>Canvas push completed successfully!</span>
        {onClear && (
          <button className="btn btn-sm btn-ghost ml-auto" onClick={onClear}>
            Dismiss
          </button>
        )}
      </div>
    );
  }

  // Failed state
  if (workflow_state === 'failed') {
    return (
      <div className="alert alert-error">
        <span>Canvas push failed{message ? `: ${message}` : '.'}</span>
        {onClear && (
          <button className="btn btn-sm btn-ghost ml-auto" onClick={onClear}>
            Dismiss
          </button>
        )}
      </div>
    );
  }

  // Queued or Running state
  if (workflow_state === 'queued' || workflow_state === 'running') {
    const statusText = workflow_state === 'queued' ? 'Queueing grades update...' : 'Updating grades...';
    
    return (
      <div className="alert alert-info">
        <span className="loading loading-spinner loading-sm"></span>
        <span>{statusText}</span>
      </div>
    );
  }

  return null;
};

export default CanvasPushProgressBanner;
