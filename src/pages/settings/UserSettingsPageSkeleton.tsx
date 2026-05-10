import { Box, Group, Skeleton, Stack } from '@mantine/core';
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import PageShell from '@components/common/PageShell';
import { FORM_MAX_WIDTH } from '@lib/constants';

const TabsSkeleton: React.FC = () => (
  <Group gap={0} mb="lg" aria-label="Loading settings tabs">
    <Skeleton height={36} width={86} radius="sm" mr={4} />
    <Skeleton height={36} width={128} radius="sm" mr={4} />
    <Skeleton height={36} width={118} radius="sm" />
  </Group>
);

const ReadOnlyFieldSkeleton: React.FC<{ labelWidth: number }> = ({ labelWidth }) => (
  <Stack gap={6}>
    <Skeleton height={12} width={labelWidth} />
    <Skeleton height={36} radius="sm" />
  </Stack>
);

const IntegrationsSettingsSkeleton: React.FC = () => (
  <Box maw={FORM_MAX_WIDTH} aria-label="Loading integration settings">
    <Skeleton height={16} width={136} mb="sm" />
    <Stack gap="sm">
      <Skeleton height={14} width="88%" />
      <ReadOnlyFieldSkeleton labelWidth={104} />
      <ReadOnlyFieldSkeleton labelWidth={126} />
      <Group align="center">
        <Skeleton height={36} width={120} radius="sm" />
        <Skeleton height={14} width={160} />
      </Group>
    </Stack>
  </Box>
);

const AppearanceSettingsSkeleton: React.FC = () => (
  <Box maw={FORM_MAX_WIDTH} aria-label="Loading appearance settings">
    <Skeleton height={16} width={104} mb="sm" />
    <Stack gap="sm">
      <Skeleton height={14} width={300} />
      <Skeleton height={36} width={260} radius="sm" />
    </Stack>
  </Box>
);

const UserSettingsSkeleton: React.FC = () => (
  <Stack gap="md" maw={FORM_MAX_WIDTH} aria-label="Loading account settings">
    <Box>
      <Skeleton height={16} width={72} mb="sm" />
      <Stack gap="sm">
        <Skeleton height={14} width="84%" />
        <ReadOnlyFieldSkeleton labelWidth={42} />
        <ReadOnlyFieldSkeleton labelWidth={38} />
        <Skeleton height={16} width={130} />
      </Stack>
    </Box>
  </Stack>
);

const UserSettingsPageSkeleton: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  return (
    <PageShell title="Settings">
      <TabsSkeleton />
      {tab === 'integrations' ? (
        <IntegrationsSettingsSkeleton />
      ) : tab === 'appearance' ? (
        <AppearanceSettingsSkeleton />
      ) : (
        <UserSettingsSkeleton />
      )}
    </PageShell>
  );
};

export default UserSettingsPageSkeleton;
