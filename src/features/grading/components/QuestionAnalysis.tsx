import { BarChart } from '@mantine/charts';
import { SimpleGrid, Card, Group, Text, Badge, Progress, Divider } from '@mantine/core';
import React, { useMemo } from 'react';

import { computeStats } from '../helpers';

import type { AdjustableSubmission, AdjustableQuestionResult } from '../types';


type Props = {
  items: AdjustableSubmission[];
  questionIds: string[];
};

const StatRow = ({ label, right }: { label: string; right: React.ReactNode }) => (
  <Group justify="space-between" py={4}>
    <Text size="sm" c="gray">{label}</Text>
    <div>{right}</div>
  </Group>
);

const ProgressRow = ({ label, pct, hint }: { label: string; pct: number; hint?: string }) => (
  <div style={{ paddingBlock: '4px' }}>
    <Group justify="space-between" mb={2}>
      <Text size="sm" c="gray">{label}</Text>
      <Text size="xs" ff="monospace">{pct.toFixed(1)}%</Text>
    </Group>
    <Progress value={Math.max(0, Math.min(100, Math.round(pct)))} size="sm" />
    {hint && <Text size="xs" c="dimmed" mt={2}>{hint}</Text>}
  </div>
);

const QuestionAnalysis: React.FC<Props> = ({ items, questionIds }) => {
  const totalStudents = items.length;

  const perQuestion = useMemo(() => {
    return questionIds.map((qid) => {
      const results: AdjustableQuestionResult[] = [];
      let maxPointsObserved = 0;

      items.forEach((gs) => {
        const res = gs.result_map?.[qid];
        if (res) {
          results.push(res);
          maxPointsObserved = Math.max(maxPointsObserved, res.max_points ?? 0);
        }
      });

      const attempts = results.length;
      const missing = Math.max(0, totalStudents - attempts);
      const missingRatePct = totalStudents > 0 ? (missing / totalStudents) * 100 : 0;

      const awarded = results.map((r) => (r.adjusted_points ?? r.points) ?? 0);
      const stats = computeStats(awarded);

      const fullCreditCount =
        maxPointsObserved > 0
          ? results.filter((r) => ((r.adjusted_points ?? r.points) ?? 0) >= maxPointsObserved).length
          : 0;
      const difficultyPct = attempts > 0 ? (fullCreditCount / attempts) * 100 : 0;

      const adjustments = results
        .map((r) => (r.adjusted_points ?? null) !== null ? ((r.adjusted_points as number) - r.points) : null)
        .filter((d): d is number => typeof d === 'number');
      const adjustmentCount = adjustments.length;
      const adjustmentAvg = adjustmentCount > 0 ? adjustments.reduce((s, v) => s + v, 0) / adjustmentCount : 0;

      const uniqueValues = Array.from(new Set(awarded)).sort((a, b) => a - b);
      const maxBins = 12;
      const binCount = Math.max(1, Math.min(maxBins, uniqueValues.length));
      const chunkSize = Math.max(1, Math.ceil(uniqueValues.length / binCount));
      const formatEdge = (value: number) => {
        if (!isFinite(value)) return '0';
        const decimals = Math.abs(value) >= 10 ? 1 : 2;
        return Number(value.toFixed(decimals)).toString();
      };

      const histogramData = Array.from({ length: binCount }, (_, i) => {
        const startIdx = i * chunkSize;
        const endIdx = Math.min(uniqueValues.length, (i + 1) * chunkSize) - 1;
        const startVal = uniqueValues[startIdx] ?? 0;
        const endVal = uniqueValues[endIdx] ?? startVal;
        const count = awarded.filter((v) => v >= startVal && v <= endVal).length;
        return {
          binLabel: startVal === endVal ? `${formatEdge(startVal)}` : `${formatEdge(startVal)}-${formatEdge(endVal)}`,
          count,
        };
      });

      return {
        qid, attempts, missing, missingRatePct, stats, maxPointsObserved,
        difficultyPct, adjustmentCount, adjustmentAvg, histogramData,
      };
    });
  }, [items, questionIds, totalStudents]);

  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
      {perQuestion.map((q) => (
        <Card key={q.qid} withBorder shadow="xs" p="md">
          <Group justify="space-between" mb="xs">
            <Text ff="monospace" size="sm" fw={600}>{q.qid}</Text>
            <Badge variant="light" color="blue" size="sm">{q.maxPointsObserved} pts</Badge>
          </Group>

          <Divider mb="xs" />

          <StatRow label="Attempts" right={<><Text span size="sm" fw={600}>{q.attempts}</Text><Text span c="dimmed" size="sm" ml={4}>/ {totalStudents}</Text></>} />
          <ProgressRow label="Missing rate" pct={q.missingRatePct} hint={`${q.attempts} attempts, ${Math.max(0, totalStudents - q.attempts)} missing`} />
          <ProgressRow label="Difficulty (Passed %)" pct={q.difficultyPct} />

          <Divider my="xs" />

          <StatRow label="Mean" right={<Text ff="monospace" size="sm">{q.stats.mean.toFixed(2)} ({q.maxPointsObserved > 0 ? ((q.stats.mean / q.maxPointsObserved) * 100).toFixed(1) : '0.0'}%)</Text>} />
          <StatRow label="Median" right={<Text ff="monospace" size="sm">{q.stats.q2.toFixed(2)}</Text>} />
          <StatRow label="Std dev" right={<Text ff="monospace" size="sm">{q.stats.stdev.toFixed(2)}</Text>} />
          <StatRow label="Range" right={<Text ff="monospace" size="sm">{q.stats.min.toFixed(2)} – {q.stats.max.toFixed(2)}</Text>} />
          <StatRow label="Adjustments" right={<Text ff="monospace" size="sm">{q.adjustmentCount}</Text>} />

          <Divider my="xs" />

          <Text size="xs" c="dimmed" mb={4} fw={500}>Distribution</Text>
          {q.maxPointsObserved <= 0 || q.histogramData.every((d: {count: number}) => d.count === 0) ? (
            <Text size="xs" c="dimmed">No data</Text>
          ) : (
            <BarChart
              h={160}
              data={q.histogramData}
              dataKey="binLabel"
              series={[{ name: 'count', color: 'blue.6', label: 'Count' }]}
              tickLine="xy"
              xAxisProps={{ tick: { fontSize: 10 } }}
              yAxisProps={{ tick: { fontSize: 10 }, allowDecimals: false }}
            />
          )}
        </Card>
      ))}
    </SimpleGrid>
  );
};

export default QuestionAnalysis;
