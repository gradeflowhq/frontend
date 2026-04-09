import { Box, Card, Group, Text, ThemeIcon } from '@mantine/core';
import React from 'react';

interface ActionOptionCardProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: React.ReactNode;
}

const ActionOptionCard: React.FC<ActionOptionCardProps> = ({ icon, iconColor, title, description }) => (
  <Card withBorder p="sm" radius="md">
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <ThemeIcon variant="light" color={iconColor} size="md" radius="xl" style={{ flexShrink: 0 }}>
        {icon}
      </ThemeIcon>
      <Box>
        <Text size="sm" fw={500}>{title}</Text>
        <Text size="xs" c="dimmed">{description}</Text>
      </Box>
    </Group>
  </Card>
);

export { ActionOptionCard };
export type { ActionOptionCardProps };
