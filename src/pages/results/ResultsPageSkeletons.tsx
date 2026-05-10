import { Divider, Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import PageShell from '@components/common/PageShell';
import { AccordionPanelsSkeleton } from '@components/common/Skeletons';
import { GroupViewSkeleton } from '@features/grading/components/group-view';
import ResultsOverviewTableSkeleton from '@features/grading/components/ResultsOverviewTableSkeleton';
import ResultsStatsSkeleton from '@features/grading/components/ResultsStatsSkeleton';

export const StatisticsPageSkeleton: React.FC = () => (
  <PageShell title="Statistics">
    <Stack gap="md" aria-label="Loading statistics page">
      <Group gap="xs">
        <Skeleton height={36} width={112} radius="sm" />
        <Skeleton height={36} width={112} radius="sm" />
      </Group>
      <ResultsStatsSkeleton />
    </Stack>
  </PageShell>
);

export const StudentsPageSkeleton: React.FC = () => (
  <PageShell
    title="Students"
    actions={(
      <>
        <Skeleton height={36} width={200} radius="sm" />
        <Skeleton height={36} width={116} radius="sm" />
      </>
    )}
  >
    <ResultsOverviewTableSkeleton />
  </PageShell>
);

export const GroupViewPageSkeleton: React.FC = () => (
  <PageShell
    title="Groups"
    actions={<Skeleton height={36} width={200} radius="sm" />}
  >
    <GroupViewSkeleton />
  </PageShell>
);

export const CanvasPushPageSkeleton: React.FC = () => (
  <PageShell title="Push to Canvas">
    <AccordionPanelsSkeleton
      items={4}
      labelWidths={[148, 72, 92, 116]}
      summaryWidths={[null, 160, 180, 160]}
      openItem={0}
      openContent={(
        <Stack gap="sm" p="sm" pt={0}>
          <Divider />
          <Skeleton height={12} width="70%" />
          <Group gap="xs">
            <Skeleton height={30} width={132} radius="sm" />
            <Skeleton height={30} width={78} radius="sm" />
          </Group>
        </Stack>
      )}
      ariaLabel="Loading Canvas publish settings"
    />
  </PageShell>
);
