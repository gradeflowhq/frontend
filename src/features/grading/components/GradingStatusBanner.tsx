import { Alert, Box, Loader, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import React from 'react';

import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';
import { getErrorMessage } from '@utils/error';

interface GradingStatusBannerProps {
  assessmentId: string;
}

const GradingStatusBanner: React.FC<GradingStatusBannerProps> = ({ assessmentId }) => {
  const { gradingInProgress, isStale, jobStatus, jobError, statusError } =
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

  if (jobStatus === 'failed') {
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
    const statusLabel = jobStatus === 'queued' ? 'queued' : 'running';
    return (
      <Alert icon={<Loader size={16} />} color="blue" mb="md">
        Grading job {statusLabel}. Showing previous results. This page will update automatically.
      </Alert>
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
