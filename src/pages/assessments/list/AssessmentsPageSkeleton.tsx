import { Box, Card, Divider, Group, SimpleGrid, Skeleton, TextInput } from '@mantine/core';
import React from 'react';

import PageShell from '@components/common/PageShell';

export const AssessmentCardSkeleton: React.FC = () => (
  <Card withBorder padding="md" radius="md" shadow="xs">
    <Group justify="space-between" align="flex-start" mb="xs" wrap="nowrap">
      <Box style={{ flex: 1 }}>
        <Skeleton height={16} width="70%" mb={8} />
        <Skeleton height={10} width="92%" mb={5} />
        <Skeleton height={10} width="58%" />
      </Box>
      <Skeleton height={24} width={24} radius="sm" />
    </Group>

    <Box mb="sm">
      <Group justify="space-between" mb={4}>
        <Skeleton height={10} width={104} />
        <Skeleton height={18} width={38} radius="xl" />
      </Group>
      <Skeleton height={8} radius="sm" />
    </Box>

    <Group gap="sm" mb="md" wrap="wrap">
      {[0, 1, 2].map((index) => (
        <Group key={index} gap={4} align="center">
          <Skeleton height={13} width={13} circle />
          <Skeleton height={10} width={index === 2 ? 58 : 28} />
        </Group>
      ))}
    </Group>

    <Divider mb="sm" />

    <Group justify="space-between" align="center">
      <Skeleton height={20} width={92} radius="xl" />
      <Skeleton height={26} width={54} radius="sm" />
    </Group>
  </Card>
);

const AssessmentsPageSkeleton: React.FC = () => (
  <PageShell
    title="My Assessments"
    actions={(
      <Group gap="xs" align="center">
        <TextInput
          aria-label="Loading assessment search"
          size="sm"
          w={200}
          disabled
          leftSection={<Skeleton height={14} width={14} circle />}
        />
        <Skeleton height={36} width={144} radius="sm" />
      </Group>
    )}
  >
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" aria-label="Loading assessments">
      {Array.from({ length: 3 }, (_, index) => (
        <AssessmentCardSkeleton key={index} />
      ))}
    </SimpleGrid>
  </PageShell>
);

export default AssessmentsPageSkeleton;
