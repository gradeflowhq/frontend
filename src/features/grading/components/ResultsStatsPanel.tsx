import { SimpleGrid, Paper, Text, Card, Group, Select, Stack } from '@mantine/core';
import React, { useMemo, useState } from 'react';

import SectionLabel from '@components/common/SectionLabel';

import { buildTotals, computeStats, buildDynamicHistogram } from '../helpers';
import { BoxPlotStrip } from './charts/BoxPlotStrip';
import { C } from './charts/chartColors';
import { HistogramWithLines } from './charts/HistogramWithLines';

import type { AdjustableSubmission } from '../types';

type Props = {
  items: AdjustableSubmission[];
};

// ── Stat card ────────────────────────────────────────────────────────────────

type PanelStatCardProps = { title: string; value: React.ReactNode; sub?: React.ReactNode };

/** Local stat card — uses Paper + richer ReactNode value. See StatCard.tsx for the simpler export. */
const PanelStatCard = ({ title, value, sub }: PanelStatCardProps) => (
  <Paper withBorder p="sm">
    <SectionLabel mb={3}>{title}</SectionLabel>
    <Text size="lg" fw={700} lh={1.2}>{value}</Text>
    {sub && <Text size="xs" fw={500} mt={3}>{sub}</Text>}
  </Paper>
);



// ── Bin selector ─────────────────────────────────────────────────────────────

const BIN_OPTIONS = [
  { label: 'Auto',    value: 'auto' },
  { label: '0.5 pts', value: '0.5'  },
  { label: '1 pt',    value: '1'    },
  { label: '2 pts',   value: '2'    },
  { label: '5 pts',   value: '5'    },
  { label: '10 pts',  value: '10'   },
];

// ── Main panel ───────────────────────────────────────────────────────────────

const ResultsStatsPanel: React.FC<Props> = ({ items }) => {
  const [binWidth, setBinWidth] = useState<number | 'auto'>('auto');

  const totals    = useMemo(() => buildTotals(items), [items]);
  const totalVals = useMemo(() => totals.map((t) => t.totalPoints), [totals]);
  const sp    = useMemo(() => computeStats(totalVals), [totalVals]);
  const pctVals = useMemo(
    () => totals.map((t) => (t.totalMax > 0 ? (t.totalPoints / t.totalMax) * 100 : 0)),
    [totals],
  );
  const spPct = useMemo(() => computeStats(pctVals), [pctVals]);

  const histogramData = useMemo(
    () => buildDynamicHistogram(totalVals, {
      maxBins: 20,
      binWidth: binWidth === 'auto' ? undefined : binWidth,
    }),
    [totalVals, binWidth],
  );

  return (
    <Stack gap={16}>

      {/* ── Stat cards ── */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <PanelStatCard
          title="Students"
          value={sp.count}
        />
        <PanelStatCard
          title="Mean"
          value={
            <Text span ff="monospace" size="lg" fw={700}>
              {sp.mean.toFixed(2)}
              <Text span size="sm" fw={600}> ± {sp.stdev.toFixed(2)}</Text>
            </Text>
          }
          sub={`${spPct.mean.toFixed(1)}% ± ${spPct.stdev.toFixed(1)}%`}
        />
        <PanelStatCard
          title="Median"
          value={<Text span ff="monospace" fw={700}>{sp.q2.toFixed(2)}</Text>}
          sub={`${spPct.q2.toFixed(1)}%`}
        />
        <PanelStatCard
          title="Min – Max"
          value={
            <Text span ff="monospace" size="lg" fw={700}>
              {sp.min.toFixed(1)}
              <Text span fw={500}> – </Text>
              {sp.max.toFixed(1)}
            </Text>
          }
          sub={`${spPct.min.toFixed(1)}% – ${spPct.max.toFixed(1)}%`}
        />
      </SimpleGrid>

      {/* ── Histogram ── */}
      <Card withBorder p="sm">
        <Group justify="space-between" mb={8} align="center">
          <SectionLabel>
            Score Histogram
          </SectionLabel>
          <Group gap="xs" align="center">
            <Text size="xs" fw={600}>Bin width</Text>
            <Select
              size="xs"
              w={110}
              value={String(binWidth)}
              onChange={(v) => setBinWidth(v === 'auto' ? 'auto' : Number(v))}
              data={BIN_OPTIONS}
            />
          </Group>
        </Group>

        {/* Legend */}
        <Group gap={16} mb={6}>
          {[
            { color: C.mean,   label: 'Mean'   },
            { color: C.median, label: 'Median' },
          ].map(({ color, label }) => (
            <Group key={label} gap={5}>
              <svg width={18} height={10} aria-hidden>
                <line x1={0} y1={5} x2={18} y2={5} stroke={color} strokeWidth={2.5} strokeDasharray="5 3" />
              </svg>
              <Text size="xs" fw={600}>{label}</Text>
            </Group>
          ))}
        </Group>

        {histogramData.length === 0 ? (
          <Text size="xs" c="dimmed">No data</Text>
        ) : (
          <HistogramWithLines data={histogramData} mean={sp.mean} median={sp.q2} height={220} />
        )}
      </Card>

      {/* ── Box plot ── */}
      <Card withBorder p="sm">
        <SectionLabel mb={10}>
          Box Plot
        </SectionLabel>
        <BoxPlotStrip
          min={sp.min} q1={sp.q1} median={sp.q2}
          mean={sp.mean} q3={sp.q3} max={sp.max}
        />
        <Group justify="center" gap="xl" mt={10}>
          {[
            { label: 'Q1',     value: sp.q1, pct: spPct.q1 },
            { label: 'Median', value: sp.q2, pct: spPct.q2 },
            { label: 'Q3',     value: sp.q3, pct: spPct.q3 },
          ].map(({ label, value, pct }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.05em' }}>{label}</Text>
              <Text size="sm" ff="monospace" fw={700}>{value.toFixed(2)}</Text>
              <Text size="xs" fw={500}>{pct.toFixed(1)}%</Text>
            </div>
          ))}
        </Group>
      </Card>

    </Stack>
  );
};

export default ResultsStatsPanel;