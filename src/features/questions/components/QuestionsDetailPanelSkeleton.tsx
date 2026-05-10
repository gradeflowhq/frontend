import { Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import { CollapsedAccordionSkeleton } from '@components/common/Skeletons';

const QuestionsDetailPanelSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading question detail">
    <Group justify="space-between" align="center" mb={4}>
      <Group gap="xs" align="center">
        <Skeleton height={18} width={48} />
        <Skeleton height={22} width={64} radius="xl" />
      </Group>
      <Group gap="xs">
        <Skeleton height={26} width={58} radius="sm" />
        <Skeleton height={26} width={68} radius="sm" />
      </Group>
    </Group>

    <Stack gap="xs">
      <Skeleton height={12} width={96} />
      <Skeleton height={16} width="72%" />
      <Skeleton height={12} width={120} mt="xs" />
      <Skeleton height={16} width="58%" />
    </Stack>

    <CollapsedAccordionSkeleton labelWidth={48} ariaLabel="Loading collapsed question config" />
    <CollapsedAccordionSkeleton labelWidth={116} ariaLabel="Loading collapsed example answers" />
  </Stack>
);

export default QuestionsDetailPanelSkeleton;
