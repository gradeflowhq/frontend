import { Box, Divider, Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import {
  FormFieldsSkeleton,
  MasterDetailSkeleton,
  TableSkeleton,
} from '@components/common/Skeletons';
import QuestionsDetailPanelSkeleton from '@features/questions/components/QuestionsDetailPanelSkeleton';
import RulesDetailPanelSkeleton from '@features/rules/components/RulesDetailPanelSkeleton';
import { SubmissionsStepSkeleton } from '@features/submissions/components';
import { FORM_MAX_WIDTH } from '@lib/constants';

const QUESTION_LIST_LINE_WIDTHS = ['48%', '68%', '58%'] as const;
const RULE_LIST_LINE_WIDTHS = ['56%', '72%', '64%'] as const;

const SearchAndManageSkeleton: React.FC<{ searchWidth?: number }> = ({ searchWidth = 180 }) => (
  <Group gap="sm">
    <Skeleton height={36} width={searchWidth} radius="sm" />
    <Skeleton height={36} width={92} radius="sm" />
  </Group>
);

export const SubmissionsPageSkeleton: React.FC = () => {
  const { assessment } = useAssessmentContext();
  const step =
    (assessment?.summary?.submission_count ?? 0) > 0
      ? 'list'
      : assessment?.source_updated_at
        ? 'configure'
        : null;

  return (
    <PageShell title="Submissions" updatedAt={assessment?.source_updated_at}>
      <SubmissionsStepSkeleton step={step} showSteps={step !== 'list'} />
    </PageShell>
  );
};

export const QuestionsWorkspaceSkeleton: React.FC = () => (
  <MasterDetailSkeleton
    listWidth="170px"
    layoutHeight="calc(100dvh - 105px)"
    withListAction
    listRowLineWidths={QUESTION_LIST_LINE_WIDTHS}
    listBadgeWidths={[54, 46, 62]}
    showListSecondaryBadge={(row) => row % 3 === 0}
    listAriaLabel="Loading questions"
    detailPanel={<QuestionsDetailPanelSkeleton />}
  />
);

export const QuestionsPageSkeleton: React.FC = () => (
  <PageShell title="Questions" actions={<Skeleton height={36} width={92} radius="sm" />}>
    <QuestionsWorkspaceSkeleton />
  </PageShell>
);

export const RulesWorkspaceSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading rules">
    <Group gap="xs">
      <Skeleton height={36} width={132} radius="sm" />
      <Skeleton height={36} width={112} radius="sm" />
    </Group>
    <MasterDetailSkeleton
      listWidth="150px"
      layoutHeight="calc(100dvh - 100px - 55px)"
      withListBadges={false}
      listRowHeight={36}
      listRowLineWidths={RULE_LIST_LINE_WIDTHS}
      listAriaLabel="Loading question rules"
      detailPanel={<RulesDetailPanelSkeleton />}
    />
  </Stack>
);

export const RulesPageSkeleton: React.FC = () => (
  <PageShell title="Rules" actions={<SearchAndManageSkeleton />}>
    <RulesWorkspaceSkeleton />
  </PageShell>
);

const MembersContentSkeleton: React.FC = () => (
  <Stack gap="md" aria-label="Loading members">
    <Group align="flex-end">
      <Stack gap={6} style={{ flex: 1 }}>
        <Skeleton height={12} width={72} />
        <Skeleton height={36} radius="sm" />
      </Stack>
      <Stack gap={6} w={160}>
        <Skeleton height={12} width={34} />
        <Skeleton height={36} radius="sm" />
      </Stack>
      <Skeleton height={36} width={70} radius="sm" />
    </Group>
    <MembersTableSkeleton />
  </Stack>
);

export const MembersTableSkeleton: React.FC = () => (
  <TableSkeleton
    columns={4}
    rows={5}
    columnTemplate="1.2fr 1.8fr 1fr 1.6fr"
    minWidth={760}
    headerWidths={[36, 34, 28, 46]}
    cellWidths={['56%', '72%', 54, 184]}
    ariaLabel="Loading members table"
  />
);

export const MembersPageSkeleton: React.FC = () => (
  <PageShell title="Members">
    <MembersContentSkeleton />
  </PageShell>
);

export const AssessmentSettingsPageSkeleton: React.FC = () => (
  <PageShell title="Assessment Settings">
    <Stack gap={0} maw={FORM_MAX_WIDTH} aria-label="Loading assessment settings">
      <Box mb="xl">
        <Skeleton height={16} width={72} mb="sm" />
        <FormFieldsSkeleton
          fields={[
            { labelWidth: 36 },
            { labelWidth: 72, inputHeight: 88 },
          ]}
          withActions
          ariaLabel="Loading general settings"
        />
      </Box>

      <Divider mb="xl" />

      <Box mb="xl">
        <Skeleton height={16} width={86} mb="sm" />
        <Stack gap="sm">
          <Skeleton height={14} width={300} />
          <Group align="flex-end" gap="xs">
            <Stack gap={6} style={{ flex: 1 }}>
              <Skeleton height={12} width={116} />
              <Skeleton height={36} radius="sm" />
            </Stack>
            <Skeleton height={36} width={36} radius="sm" />
          </Group>
          <Skeleton height={36} width={184} radius="sm" />
        </Stack>
      </Box>

      <Divider mb="xl" />

      <Box>
        <Skeleton height={16} width={92} mb="sm" />
        <Skeleton height={36} width={184} radius="sm" />
        <Skeleton height={12} width={360} mt="xs" />
      </Box>
    </Stack>
  </PageShell>
);
