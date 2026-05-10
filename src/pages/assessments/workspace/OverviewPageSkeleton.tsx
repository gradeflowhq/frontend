import { Card, Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import PageShell from '@components/common/PageShell';

const OverviewPageSkeleton: React.FC = () => (
  <PageShell
    title={(
      <Stack gap={6}>
        <Skeleton height={24} width={180} />
        <Skeleton height={14} width={280} />
      </Stack>
    )}
    actions={<Skeleton height={36} width={116} radius="sm" />}
  >
    <Stack gap="md" aria-label="Loading overview">
      <Card withBorder radius="md" padding="lg">
        <Skeleton height={12} width={148} mb="md" />
        <Stack gap="lg">
          {[0, 1, 2].map((index) => (
            <Group key={index} gap="md" align="flex-start" wrap="nowrap">
              <Skeleton height={28} width={28} circle />
              <Stack gap={6} style={{ flex: 1 }}>
                <Group gap="xs">
                  <Skeleton height={14} width={index === 0 ? 92 : 124} />
                  <Skeleton height={18} width={76} radius="xl" />
                  <Skeleton height={18} width={104} radius="xl" />
                </Group>
                {index === 1 && <Skeleton height={26} width={82} radius="sm" />}
              </Stack>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" align="center" mb="md">
          <Stack gap={6}>
            <Skeleton height={12} width={112} />
            <Skeleton height={14} width={156} />
          </Stack>
          <Group gap="xs">
            <Skeleton height={26} width={92} radius="sm" />
            <Skeleton height={26} width={72} radius="sm" />
          </Group>
        </Group>
        <Skeleton height={1} mb="md" />
        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
          {Array.from({ length: 5 }, (_, index) => (
            <Card key={index} withBorder p="xs">
              <Skeleton height={10} width={54} mb={8} />
              <Skeleton height={20} width={index === 0 ? 64 : 48} mb={6} />
              <Skeleton height={10} width={42} />
            </Card>
          ))}
        </SimpleGrid>
      </Card>
    </Stack>
  </PageShell>
);

export default OverviewPageSkeleton;
