import { Card, Group, Stack, Text, Badge, Loader } from '@mantine/core';
import React from 'react';

export type InfoRowProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export const InfoRow: React.FC<InfoRowProps> = ({ title, description, action, children }) => (
  <Card withBorder shadow="sm">
    <Stack gap="sm">
      <Group align="flex-start" justify="space-between">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          {description && <Text size="sm" c="dimmed">{description}</Text>}
        </Stack>
        {action}
      </Group>
      {children}
    </Stack>
  </Card>
);

export const LoadingBadge: React.FC<{ label: string }> = ({ label }) => (
  <Badge variant="light" leftSection={<Loader size="xs" />}>{label}</Badge>
);
