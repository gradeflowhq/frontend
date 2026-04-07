import { Card, Text } from '@mantine/core';
import React from 'react';

interface Props {
  title: string;
  value: string;
  sub?: string;
}

const StatCard: React.FC<Props> = ({ title, value, sub }) => (
  <Card withBorder padding="sm" radius="md">
    <Text
      size="xs"
      c="dimmed"
      tt="uppercase"
      fw={600}
      style={{ letterSpacing: '0.05em' }}
      mb={4}
    >
      {title}
    </Text>
    <Text ff="monospace" fw={700} size="lg">
      {value}
    </Text>
    {sub && (
      <Text size="xs" c="dimmed" mt={2}>
        {sub}
      </Text>
    )}
  </Card>
);

export default StatCard;
