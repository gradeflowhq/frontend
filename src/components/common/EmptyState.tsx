import { Center, Stack, Text } from '@mantine/core';
import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <Center py="xl">
    <Stack align="center" gap="md">
      {icon}
      <Text fw={500} size="lg" ta="center">{title}</Text>
      {description && <Text c="dimmed" ta="center">{description}</Text>}
      {action}
    </Stack>
  </Center>
);

export default EmptyState;
