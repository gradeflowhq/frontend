import { Box, Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import { TableSkeleton } from '@components/common/Skeletons';

const ResultsOverviewTableSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading results overview">
    <Box
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        padding: 'var(--mantine-spacing-sm)',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="md" align="center" style={{ flex: 1 }}>
          <Skeleton height={12} width={72} />
          <Group gap="xs" align="center" style={{ flex: 1, minWidth: 160 }}>
            <Skeleton height={12} width={28} />
            <Skeleton height={8} style={{ flex: 1 }} />
            <Skeleton height={12} width={34} />
          </Group>
        </Group>
        <Group gap="xs" align="center" ml="md">
          <Skeleton height={12} width={52} />
          <Skeleton height={30} width={88} radius="sm" />
        </Group>
      </Group>
    </Box>
    <TableSkeleton
      columns={5}
      rows={8}
      columnTemplate="1.2fr repeat(3, minmax(96px, 1fr)) 1.1fr"
      minWidth={760}
      headerWidths={[72, 28, 28, 28, 44]}
      cellWidths={['62%', '42%', '42%', '42%', '54%']}
      secondaryLine={{ columns: [1, 2, 3, 4], width: '86%' }}
      secondaryWidths={['100%', '100%', '100%', '78%']}
    />
  </Stack>
);

export default ResultsOverviewTableSkeleton;
