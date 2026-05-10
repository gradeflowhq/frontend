import { Box, Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import { MasterDetailSkeleton } from '@components/common/Skeletons';

const frameStyle: React.CSSProperties = {
  border: '1px solid var(--mantine-color-default-border)',
  borderRadius: 'var(--mantine-radius-sm)',
  overflow: 'hidden',
};

const GroupViewSkeleton: React.FC = () => (
  <MasterDetailSkeleton
    listWidth="180px"
    layoutHeight="calc(100dvh - 105px)"
    withListBadges={false}
    listRowHeight={36}
    listRowLineWidths={['48%', '68%', '58%']}
    listAriaLabel="Loading group questions"
    detailPanel={(
      <Stack gap="md" aria-label="Loading answer groups">
        <Group justify="space-between">
          <Group gap="sm">
            <Skeleton height={18} width={48} />
            <Skeleton height={22} width={64} radius="xl" />
            <Skeleton height={14} width={92} />
            <Skeleton height={14} width={72} />
          </Group>
          <Group gap="xs">
            <Skeleton height={22} width={104} radius="xl" />
            <Skeleton height={22} width={82} radius="xl" />
          </Group>
        </Group>

        <Group gap="xs" align="center">
          <Skeleton height={36} width={188} radius="sm" />
          <Skeleton height={20} width={132} />
          <Skeleton height={28} width={28} radius="sm" />
        </Group>

        <Stack gap="xs">
          {[0, 1, 2].map((index) => (
            <Box key={index} style={frameStyle}>
              <Group justify="space-between" p="sm">
                <Group gap="xs">
                  <Skeleton height={22} width={72} radius="xl" />
                  <Skeleton height={14} width={index === 0 ? 220 : 150} />
                  {index === 1 && <Skeleton height={18} width={72} radius="xl" />}
                </Group>
                <Group gap="xs">
                  <Skeleton height={12} width={84} />
                  <Skeleton height={28} width={28} radius="sm" />
                  <Skeleton height={28} width={72} radius="sm" />
                </Group>
              </Group>
            </Box>
          ))}
        </Stack>
      </Stack>
    )}
  />
);

export default GroupViewSkeleton;
