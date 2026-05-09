import { Alert, Box, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import React from 'react';

import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import SectionStatusBadge from '@components/common/SectionStatusBadge';
import JobProgressAlert from '@features/grading/components/JobProgressAlert';
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';
import { getErrorMessage } from '@utils/error';

interface GradingStatusBannerProps {
  assessmentId: string;
}

const GradingStatusBanner: React.FC<GradingStatusBannerProps> = ({ assessmentId }) => {
  const { gradingInProgress, isStale, jobStatus, jobError, statusError, jobProgress } =
    useGradingStatus(assessmentId);

  if (statusError) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        color="red"
        title="Grading status unavailable"
        mb="md"
      >
        <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {getErrorMessage(statusError)}
        </Text>
      </Alert>
    );
  }

  if (jobStatus === JobStatus.failed) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        color="red"
        title="Grading failed"
        mb="md"
      >
        <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {jobError ?? 'Grading job failed.'}
        </Text>
      </Alert>
    );
  }

  if (gradingInProgress) {
    const statusLabel = jobStatus === JobStatus.queued ? 'queued' : 'running';
    return (
      <JobProgressAlert
        statusText={`Grading job ${statusLabel}`}
        secondaryText="showing previous results"
        progress={jobProgress}
        mb="md"
      />
    );
  }

  if (isStale) {
    return (
      <Box mb="md">
        <SectionStatusBadge
          isStale
          staleMessage="Results may be out of date — submissions or rules have changed since the last grading run."
        />
      </Box>
    );
  }

  return null;
};

export default GradingStatusBanner;
