import { Group, Stack, Text, Badge, Loader } from '@mantine/core';
import React from 'react';

export type InfoRowProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  /** Action rendered below the children (e.g. a Refresh button). */
  bottomAction?: React.ReactNode;
  children: React.ReactNode;
};

export const InfoRow: React.FC<InfoRowProps> = ({ title, description, action, bottomAction, children }) => (
  <Stack gap="sm">
    {(title || action) && (
      <Group align="flex-start" justify="space-between">
        <Stack gap={2}>
          {title && <Text fw={600}>{title}</Text>}
          {description && <Text size="sm" c="dimmed">{description}</Text>}
        </Stack>
        {action}
      </Group>
    )}
    {children}
    {bottomAction}
  </Stack>
);

export const LoadingBadge: React.FC<{ label: string }> = ({ label }) => (
  <Badge variant="light" leftSection={<Loader size="xs" />}>{label}</Badge>
);
