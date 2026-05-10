import { Stack, Text } from '@mantine/core';
import React from 'react';

import MarkdownText from '@components/common/MarkdownText';

const RuleDescriptionBlock: React.FC<{
  description: string;
}> = ({ description }) => (
  <Stack gap={2} mb="xs">
    <Text c="dimmed" size="sm" fw={500}>
      Rule
    </Text>
    <MarkdownText>{description}</MarkdownText>
  </Stack>
);

export default RuleDescriptionBlock;
