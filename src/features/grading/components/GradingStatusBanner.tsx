import { Alert, Box } from '@mantine/core';
import { IconLoader } from '@tabler/icons-react';
import React from 'react';

import SectionStatusBadge from '@components/common/SectionStatusBadge';
import { useGradingStatus } from '@features/grading/hooks/useGradingStatus';

interface GradingStatusBannerProps {
  assessmentId: string;
}

const GradingStatusBanner: React.FC<GradingStatusBannerProps> = ({ assessmentId }) => {
  const { gradingInProgress, isStale } = useGradingStatus(assessmentId);

  if (gradingInProgress) {
    return (
      <Alert icon={<IconLoader size={16} />} color="blue" mb="md">
        Grading in progress… Showing previous results. This page will update automatically.
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
