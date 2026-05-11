import { Progress } from '@mantine/core';
import React from 'react';

import { isJobProgressIndeterminate } from '@features/grading/helpers/jobProgress';

import type { JobProgress } from '@features/grading/helpers/jobProgress';

type Props = {
  progress: JobProgress;
};

const JobProgressIndicator: React.FC<Props> = ({ progress }) => {
  if (progress.percent === null) return null;

  const percent = Math.min(100, Math.max(0, progress.percent));
  const isIndeterminate = isJobProgressIndeterminate(progress);

  return (
    <Progress
      aria-label="Estimated job progress"
      animated={isIndeterminate}
      color="blue.6"
      radius={0}
      size={4}
      striped={isIndeterminate}
      style={{
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
      }}
      styles={{
        root: {
          backgroundColor: 'var(--mantine-color-blue-light-hover)',
        },
        section: {
          transitionTimingFunction: 'linear',
        },
      }}
      transitionDuration={isIndeterminate ? 0 : progress.transitionMs}
      value={isIndeterminate ? 100 : percent}
    />
  );
};

export default JobProgressIndicator;
