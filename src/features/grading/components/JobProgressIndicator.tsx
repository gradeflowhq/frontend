import React from 'react';

import type { JobProgress } from '@features/grading/helpers/jobProgress';

type Props = {
  progress: JobProgress;
};

const JobProgressIndicator: React.FC<Props> = ({ progress }) => {
  if (progress.percent === null) return null;

  const percent = Math.min(100, Math.max(0, progress.percent));

  return (
    <div
      aria-label="Estimated job progress"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percent}
      role="progressbar"
      style={{
        background: 'var(--mantine-color-blue-light-hover)',
        bottom: 0,
        height: 4,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
      }}
    >
      <div
        style={{
          background: progress.overdue
            ? 'var(--mantine-color-orange-6)'
            : 'var(--mantine-color-blue-6)',
          height: '100%',
          transitionDuration: `${progress.transitionMs ?? 0}ms`,
          transitionProperty: 'width',
          transitionTimingFunction: 'linear',
          width: `${percent}%`,
        }}
      />
    </div>
  );
};

export default JobProgressIndicator;
