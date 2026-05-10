import { Card, Divider, Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import React from 'react';

const commonWrongAnswerWidths = ['72%', '44%', '58%'] as const;

const wrongAnswerWidthAt = (index: number): (typeof commonWrongAnswerWidths)[number] =>
  commonWrongAnswerWidths[index % commonWrongAnswerWidths.length];

const QuestionAnalysisGridSkeleton: React.FC<{ cards?: number }> = ({ cards = 3 }) => (
  <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" aria-label="Loading question analysis">
    {Array.from({ length: cards }, (_, index) => (
      <Card key={index} withBorder shadow="xs" p="sm">
        <Group justify="space-between" mb={12}>
          <Skeleton height={14} width={48} />
          <Group gap={4}>
            <Skeleton height={18} width={44} radius="xl" />
            <Skeleton height={18} width={52} radius="xl" />
          </Group>
        </Group>

        <Skeleton height={10} width={132} mb={8} />
        {[0, 1].map((row) => (
          <Stack key={row} gap={4} mb={8}>
            <Group justify="space-between">
              <Skeleton height={10} width={72} />
              <Skeleton height={10} width={40} />
            </Group>
            <Skeleton height={5} />
          </Stack>
        ))}

        <Skeleton height={10} width={84} mt={10} mb={8} />
        {[0, 1, 2].map((row) => (
          <Group key={row} justify="space-between" mb={6}>
            <Skeleton height={10} width={wrongAnswerWidthAt(row)} />
            <Skeleton height={10} width={64} />
          </Group>
        ))}

        <Divider my="sm" />
        <Group justify="space-between" align="center" mb={8}>
          <Skeleton height={10} width={88} />
          <Skeleton height={26} width={116} radius="sm" />
        </Group>
        <Skeleton height={130} radius="sm" />
      </Card>
    ))}
  </SimpleGrid>
);

export default QuestionAnalysisGridSkeleton;
