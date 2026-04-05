import { List, Text, Box, Badge } from '@mantine/core';
import React from 'react';

type AnswerTextProps = {
  value: unknown;
  maxLength?: number;
  emptyText?: string;
};

const AnswerText: React.FC<AnswerTextProps> = ({
  value,
  maxLength,
  emptyText = '\u2014',
}) => {
  const renderAnswer = () => {
    if (value === null || value === undefined) {
      return <Text c="dimmed" span>{emptyText}</Text>;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <Text c="dimmed" fs="italic" span>Empty array</Text>;
      }

      return (
        <List m={0} p={0}>
          {value.map((item, idx) => (
            <List.Item key={idx}>
              <Badge size="sm" color="gray" mr="xs">
                {idx + 1}
              </Badge>
              <Text size="xs" ff="monospace" span>
                {String(item)}
              </Text>
            </List.Item>
          ))}
        </List>
      );
    }

    // Handle primitives (string, number, boolean)
    const strValue = String(value);

    if (maxLength && strValue.length > maxLength) {
      const truncated = strValue.slice(0, maxLength) + '...';
      return <Text span title={strValue}>{truncated}</Text>;
    }

    return <Text span>{strValue}</Text>;
  };

  return (
    <Box style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {renderAnswer()}
    </Box>
  );
};

export default AnswerText;
