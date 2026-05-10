import { Box, Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import { TableSkeleton } from '@components/common/Skeletons';

import type { Step } from './StepIndicator';

export const SubmissionsTableSkeleton: React.FC = () => (
  <TableSkeleton
    columns={4}
    rows={8}
    columnTemplate="1fr repeat(3, minmax(140px, 1.4fr))"
    minWidth={720}
    withFooter
    headerWidths={[72, 28, 28, 28]}
    cellWidths={['58%', '86%', '82%', '78%']}
    secondaryLine={{ columns: [1, 2, 3], width: '72%' }}
    ariaLabel="Loading submissions table"
  />
);

export const UploadStepSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading upload step">
    <Box
      style={{
        border: '1px dashed var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        minHeight: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mantine-spacing-md)',
      }}
    >
      <Group gap="xl" align="center">
        <Skeleton height={40} width={40} radius="sm" />
        <Stack gap={8}>
          <Skeleton height={18} width={300} />
          <Skeleton height={14} width={240} />
        </Stack>
      </Group>
    </Box>
    <Group justify="flex-end">
      <Skeleton height={36} width={82} radius="sm" />
    </Group>
  </Stack>
);

export const ConfigureStepSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading configure step">
    <Group justify="space-between" align="center">
      <Stack gap={6} style={{ flex: 1 }}>
        <Skeleton height={12} width="84%" />
        <Skeleton height={12} width="52%" />
      </Stack>
      <Group gap="xs">
        <Skeleton height={26} width={72} radius="sm" />
        <Skeleton height={26} width={84} radius="sm" />
      </Group>
    </Group>
    <TableSkeleton
      columns={4}
      rows={6}
      columnTemplate="96px 1fr 2fr 1.4fr"
      minWidth={760}
      headerWidths={[56, 48, 92, 128]}
      cellWidths={[18, '68%', '82%', 224]}
      secondaryLine={{ columns: [2], width: '54%' }}
      ariaLabel="Loading column configuration table"
    />
    <Group justify="space-between" mt="md">
      <Skeleton height={36} width={86} radius="sm" />
      <Skeleton height={36} width={76} radius="sm" />
    </Group>
  </Stack>
);

export const StepIndicatorSkeleton: React.FC = () => (
  <Group gap="sm" mb="xl" aria-label="Loading steps">
    {[0, 1, 2].map((index) => (
      <React.Fragment key={index}>
        <Group gap="xs" wrap="nowrap">
          <Skeleton height={28} width={28} circle />
          <Skeleton height={12} width={index === 1 ? 124 : 86} />
        </Group>
        {index < 2 && <Skeleton height={2} style={{ flex: 1 }} />}
      </React.Fragment>
    ))}
  </Group>
);

export const SubmissionsStepSkeleton: React.FC<{
  step: Step | null;
  showSteps?: boolean;
}> = ({ step, showSteps = step !== 'list' }) => (
  <Stack gap="md">
    {showSteps && <StepIndicatorSkeleton />}
    {step === 'upload' && <UploadStepSkeleton />}
    {step === 'configure' && <ConfigureStepSkeleton />}
    {step === 'list' && <SubmissionsTableSkeleton />}
  </Stack>
);
