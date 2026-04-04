import { BarChart } from '@mantine/charts';
import { SimpleGrid, Paper, Text, Card, Group, Select } from '@mantine/core';
import React, { useMemo, useState } from 'react';

import { buildTotals, computeStats, buildDynamicHistogram } from '../helpers';

import type { AdjustableSubmission } from '../types';

type Props = {
  items: AdjustableSubmission[];
};

type StatCardProps = { title: string; value: React.ReactNode; desc?: React.ReactNode };

const StatCard = ({ title, value, desc }: StatCardProps) => (
  <Paper withBorder p="md">
    <Text size="sm" c="dimmed">{title}</Text>
    <Text size="xl" fw={700}>{value}</Text>
    {desc && <Text size="xs" c="dimmed">{desc}</Text>}
  </Paper>
);

const BIN_OPTIONS = [
  { label: 'Auto (adaptive)', value: 'auto' },
  { label: '0.5 pts', value: '0.5' },
  { label: '1 pt', value: '1' },
  { label: '2 pts', value: '2' },
  { label: '5 pts', value: '5' },
  { label: '10 pts', value: '10' },
];

const ResultsStats: React.FC<Props> = ({ items }) => {
  const [binWidth, setBinWidth] = useState<number | 'auto'>('auto');

  const totals = useMemo(() => buildTotals(items), [items]);
  const totalValues = useMemo(() => totals.map((t) => t.totalPoints), [totals]);
  const maxTotals = useMemo(() => Math.max(1, ...totals.map((t) => t.totalMax)), [totals]);

  const statsPoints = useMemo(() => computeStats(totalValues), [totalValues]);
  const percentValues = useMemo(
    () => totals.map((t) => (t.totalMax > 0 ? (t.totalPoints / t.totalMax) * 100 : 0)),
    [totals]
  );
  const statsPercent = useMemo(() => computeStats(percentValues), [percentValues]);

  const histogramData = useMemo(
    () =>
      buildDynamicHistogram(totalValues, {
        maxBins: 20,
        binWidth: binWidth === 'auto' ? undefined : binWidth,
      }),
    [totalValues, binWidth]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        <StatCard title="Students" value={statsPoints.count} />
        <StatCard
          title="Mean total"
          value={
            <>
              <Text span ff="monospace">{statsPoints.mean.toFixed(2)}</Text>
              <Text span c="dimmed" ml={4}>/ {maxTotals}</Text>
            </>
          }
          desc={`${statsPercent.mean.toFixed(1)}%`}
        />
        <StatCard
          title="Std dev"
          value={statsPoints.stdev.toFixed(2)}
          desc={`${statsPercent.stdev.toFixed(1)}%`}
        />
        <StatCard
          title="Min – Max"
          value={<Text ff="monospace">{statsPoints.min.toFixed(2)} – {statsPoints.max.toFixed(2)}</Text>}
          desc={`${statsPercent.min.toFixed(1)}% – ${statsPercent.max.toFixed(1)}%`}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, md: 3 }} spacing="sm">
        <StatCard title="Q1" value={statsPoints.q1.toFixed(2)} desc={`${statsPercent.q1.toFixed(1)}%`} />
        <StatCard title="Median (Q2)" value={statsPoints.q2.toFixed(2)} desc={`${statsPercent.q2.toFixed(1)}%`} />
        <StatCard title="Q3" value={statsPoints.q3.toFixed(2)} desc={`${statsPercent.q3.toFixed(1)}%`} />
      </SimpleGrid>

      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Distribution</Text>
          <Select
            size="xs"
            w={140}
            label="Bin width"
            value={String(binWidth)}
            onChange={(v) => setBinWidth(v === 'auto' ? 'auto' : Number(v))}
            data={BIN_OPTIONS}
          />
        </Group>
        {histogramData.length === 0 ? (
          <Text size="xs" c="dimmed">No data</Text>
        ) : (
          <BarChart
            h={240}
            data={histogramData}
            dataKey="binLabel"
            series={[{ name: 'count', color: 'blue.6', label: 'Count' }]}
            tickLine="xy"
            xAxisProps={{ tick: { fontSize: 12 } }}
            yAxisProps={{ tick: { fontSize: 12 }, allowDecimals: false }}
          />
        )}
      </Card>
    </div>
  );
};

export default ResultsStats;
