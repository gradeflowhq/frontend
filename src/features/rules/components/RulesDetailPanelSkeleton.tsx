import { Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import { CollapsedAccordionSkeleton } from '@components/common/Skeletons';

const RulesDetailPanelSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading rule detail">
    <Group justify="space-between" align="center">
      <Group gap="xs">
        <Skeleton height={18} width={56} />
        <Skeleton height={22} width={68} radius="xl" />
        <Skeleton height={22} width={96} radius="xl" />
      </Group>
      <Group gap="xs">
        <Skeleton height={26} width={58} radius="sm" />
        <Skeleton height={26} width={68} radius="sm" />
      </Group>
    </Group>

    <Stack gap={2} mb="xs">
      <Skeleton height={12} width={34} />
      <Skeleton height={16} width="72%" />
      <Skeleton height={16} width="58%" />
    </Stack>

    <CollapsedAccordionSkeleton labelWidth={48} ariaLabel="Loading collapsed rule config" />
    <CollapsedAccordionSkeleton labelWidth={116} ariaLabel="Loading collapsed grading preview" />
  </Stack>
);

export default RulesDetailPanelSkeleton;
