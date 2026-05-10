import { Group, Paper, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import PageShell from '@components/common/PageShell';

const SubmissionDetailPageSkeleton: React.FC = () => (
  <PageShell
    title={(
      <Group gap="md" align="center" wrap="wrap">
        <Skeleton height={28} width={132} />
        <Group gap="sm" align="center">
          <Skeleton height={36} width={86} radius="sm" />
          <Skeleton height={36} width={220} radius="sm" />
          <Skeleton height={14} width={64} />
        </Group>
      </Group>
    )}
    actions={(
      <Group gap="xs">
        <Skeleton height={36} width={36} radius="sm" />
        <Skeleton height={36} width={36} radius="sm" />
      </Group>
    )}
  >
    <Stack gap="md" aria-label="Loading submission detail">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {[0, 1, 2].map((index) => (
          <Paper key={index} withBorder p="md">
            <Skeleton height={10} width={index === 2 ? 84 : 112} mb={8} />
            <Group gap="xs" align="baseline">
              <Skeleton height={28} width={72} />
              {index !== 2 && <Skeleton height={14} width={44} />}
            </Group>
            {index !== 2 && (
              <Group gap="xs" mt={10} align="center">
                <Skeleton height={8} width={120} />
                <Skeleton height={12} width={42} />
              </Group>
            )}
          </Paper>
        ))}
      </SimpleGrid>

      <Group justify="space-between" align="center" px={4}>
        <Group gap="sm">
          <Skeleton height={30} width={296} radius="sm" />
          <Skeleton height={14} width={86} />
        </Group>
        <Skeleton height={36} width={84} radius="sm" />
      </Group>

      <Stack gap="sm">
        {[0, 1, 2].map((index) => (
          <Paper
            key={index}
            withBorder
            p="sm"
            radius="md"
            style={{ borderLeft: '3px solid var(--mantine-color-default-border)' }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
              <Group gap="sm" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
                <Group gap="xs" align="center" wrap="nowrap">
                  <Skeleton height={16} width={16} circle />
                  <Skeleton height={16} width={48} />
                </Group>
                <Skeleton height={12} width={index === 0 ? '42%' : '28%'} />
              </Group>

              <Group gap="xs" wrap="nowrap" align="center">
                <Skeleton height={22} width={54} radius="xl" />
                <Skeleton height={16} width={64} />
                {index === 1 && <Skeleton height={18} width={34} radius="xl" />}
                <Skeleton height={14} width={14} />
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Stack>
  </PageShell>
);

export default SubmissionDetailPageSkeleton;
