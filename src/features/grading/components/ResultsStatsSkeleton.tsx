import { Stack } from '@mantine/core';
import React from 'react';

import { ChartCardSkeleton, MetricCardsSkeleton } from '@components/common/Skeletons';

const DISTRIBUTION_BAR_HEIGHTS = [38, 84, 132, 68, 156, 112, 92, 146] as const;

const ResultsStatsSkeleton: React.FC = () => (
  <Stack gap={16} aria-label="Loading statistics">
    <MetricCardsSkeleton
      cards={4}
      valueWidths={[44, 92, 92, 92]}
      metaWidths={[56, 72]}
    />
    <ChartCardSkeleton
      withToolbar
      legendWidths={[64, 72]}
      barHeights={DISTRIBUTION_BAR_HEIGHTS}
    />
    <ChartCardSkeleton withFooter />
  </Stack>
);

export default ResultsStatsSkeleton;
