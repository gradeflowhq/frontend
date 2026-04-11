import { Stack, Text } from '@mantine/core';
import React from 'react';

const RuleDescriptionBlock: React.FC<{
  description: string;
}> = ({ description }) => (
  <Stack gap={2} mb="xs">
    <Text c="dimmed">
      Description
    </Text>
    <Text component="div" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {description}
    </Text>
  </Stack>
);

export default RuleDescriptionBlock;