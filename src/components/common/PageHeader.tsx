import { Stack, Group, Title, Text } from '@mantine/core';
import React from 'react';

type PageHeaderProps = {
  title: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, actions, breadcrumbs }) => (
  <Stack gap="xs" mb="md">
    {breadcrumbs && <Text size="sm" c="dimmed">{breadcrumbs}</Text>}
    <Group justify="space-between">
      <Title order={2}>{title}</Title>
      {actions}
    </Group>
  </Stack>
);

export default PageHeader;