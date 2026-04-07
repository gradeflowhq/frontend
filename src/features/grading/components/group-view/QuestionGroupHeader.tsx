import { Badge, Group, Text } from '@mantine/core';
import React from 'react';

interface QuestionGroupHeaderProps {
  qid: string;
  questionType: string;
  totalStudents: number;
  passedCount: number;
  maxPoints: number;
  adjustmentCount: number;
}

const QuestionGroupHeader: React.FC<QuestionGroupHeaderProps> = ({
  qid,
  questionType,
  totalStudents,
  passedCount,
  maxPoints,
  adjustmentCount,
}) => {
  const pct = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;

  return (
    <Group justify="space-between" wrap="nowrap" gap="sm">
      <Group gap="sm" wrap="wrap">
        <Text ff="monospace" fw={700} size="md">
          {qid}
        </Text>
        <Badge variant="light" color="gray">
          {questionType}
        </Badge>
        <Text size="sm" c="dimmed">
          {totalStudents} students
        </Text>
        <Text size="sm" c="dimmed">
          max {maxPoints} pts
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Badge variant="light" color="green">
          {passedCount} passed ({pct}%)
        </Badge>
        {adjustmentCount > 0 && (
          <Badge variant="light" color="yellow">
            {adjustmentCount} adjusted
          </Badge>
        )}
      </Group>
    </Group>
  );
};

export default QuestionGroupHeader;
