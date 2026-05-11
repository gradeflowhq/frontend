import { Alert, Group, Loader, Text } from '@mantine/core';
import React from 'react';

import JobProgressIndicator from '@features/grading/components/JobProgressIndicator';
import { getJobProgressText } from '@features/grading/helpers/jobProgress';

import type { JobProgress } from '@features/grading/helpers/jobProgress';

type Props = {
  statusText: string;
  secondaryText?: string;
  progress?: JobProgress | null;
  action?: React.ReactNode;
  mb?: React.ComponentProps<typeof Alert>['mb'];
  radius?: React.ComponentProps<typeof Alert>['radius'];
};

const OVERDUE_MESSAGE = 'Taking longer than expected';

const renderProgressText = (progress: JobProgress): React.ReactNode => {
  const statusText = getJobProgressText(progress, OVERDUE_MESSAGE);
  if (!statusText) return null;

  return (
    <Text
      size="xs"
      c="dimmed"
      span
      style={{ whiteSpace: 'nowrap' }}
    >
      {statusText}
    </Text>
  );
};

const JobProgressAlert: React.FC<Props> = ({
  statusText,
  secondaryText,
  progress,
  action,
  mb,
  radius,
}) => (
  <Alert
    color="blue"
    p="xs"
    mb={mb}
    radius={radius}
    style={{ overflow: 'hidden', position: 'relative' }}
  >
    <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
      <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
        <Loader size={14} style={{ flex: '0 0 auto' }} />
        <Text size="sm" truncate>
          {statusText}
          {secondaryText && <Text span c="dimmed"> · {secondaryText}</Text>}
        </Text>
        {progress && renderProgressText(progress)}
      </Group>
      {action}
    </Group>
    {progress && <JobProgressIndicator progress={progress} />}
  </Alert>
);

export default JobProgressAlert;
