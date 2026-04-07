import { BarChart } from '@mantine/charts';
import { SimpleGrid, Paper, Text, Card, Group, Select, Box } from '@mantine/core';
import React, { useMemo, useState } from 'react';

import { buildTotals, computeStats, buildDynamicHistogram } from '../helpers';

import type { AdjustableSubmission } from '../types';

type Props = {
  items: AdjustableSubmission[];
};

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  mean:    'var(--mantine-color-blue-6)',
  median:  'var(--mantine-color-teal-6)',
  box:     'var(--mantine-color-blue-3)',
  track:   'var(--mantine-color-gray-4)',
  whisker: 'var(--mantine-color-dark-4)',
};

// ── Stat card ────────────────────────────────────────────────────────────────

type PanelStatCardProps = { title: string; value: React.ReactNode; sub?: React.ReactNode };

/** Local stat card — uses Paper + richer ReactNode value. See StatCard.tsx for the simpler export. */
const PanelStatCard = ({ title, value, sub }: PanelStatCardProps) => (
  <Paper withBorder p="sm">
    <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }} mb={3}>
      {title}
    </Text>
    <Text size="lg" fw={700} lh={1.2}>{value}</Text>
    {sub && <Text size="xs" fw={500} mt={3}>{sub}</Text>}
  </Paper>
);

// ── Box plot strip ────────────────────────────────────────────────────────────

const BoxPlotStrip: React.FC<{
  min: number; q1: number; median: number; mean: number; q3: number; max: number;
}> = ({ min, q1, median, mean, q3, max }) => {
  const range = max - min || 1;
  const pct = (v: number) => `${((v - min) / range) * 100}%`;

  return (
    <Box style={{ position: 'relative', height: 52, userSelect: 'none' }}>
      {/* Track */}
      <Box style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        height: 4, borderRadius: 2, background: C.track,
        transform: 'translateY(-50%)',
      }} />

      {/* IQR box */}
      <Box style={{
        position: 'absolute', top: '50%',
        left: pct(q1), width: `${((q3 - q1) / range) * 100}%`,
        height: 16, borderRadius: 3,
        background: C.box,
        transform: 'translateY(-50%)',
      }} />

      {/* Min / max whisker caps */}
      {[min, max].map((v) => (
        <Box key={v} style={{
          position: 'absolute', top: '50%', left: pct(v),
          width: 2, height: 20, borderRadius: 1,
          background: C.whisker,
          transform: 'translate(-50%, -50%)',
        }} />
      ))}

      {/* Median line */}
      <Box style={{
        position: 'absolute', top: '50%', left: pct(median),
        width: 3, height: 22, borderRadius: 1,
        background: C.median,
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
      }} />

      {/* Mean dot */}
      <Box style={{
        position: 'absolute', top: '50%', left: pct(mean),
        width: 12, height: 12, borderRadius: '50%',
        background: C.mean,
        border: '2px solid white',
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />

      {/* Axis labels */}
      <Text size="xs" ff="monospace" fw={600}
        style={{ position: 'absolute', bottom: 0, left: 0 }}>
        {min.toFixed(1)}
      </Text>
      <Text size="xs" ff="monospace" fw={600}
        style={{ position: 'absolute', bottom: 0, right: 0 }}>
        {max.toFixed(1)}
      </Text>

      {/* Legend */}
      <Group gap={12} style={{ position: 'absolute', top: 0, right: 0 }}>
        <Group gap={4}>
          <Box style={{
            width: 11, height: 11, borderRadius: '50%',
            background: C.mean, border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }} />
          <Text size="xs" fw={600}>Mean</Text>
        </Group>
        <Group gap={4}>
          <Box style={{ width: 3, height: 13, borderRadius: 1, background: C.median }} />
          <Text size="xs" fw={600}>Median</Text>
        </Group>
        <Group gap={4}>
          <Box style={{ width: 13, height: 9, borderRadius: 2, background: C.box }} />
          <Text size="xs" fw={600}>IQR</Text>
        </Group>
      </Group>
    </Box>
  );
};

// ── Histogram with reference lines ───────────────────────────────────────────

const HistogramWithLines: React.FC<{
  data: { binLabel: string; count: number }[];
  mean: number;
  median: number;
  height: number;
}> = ({ data, mean, median, height }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const marginLeft  = 52;
  const marginRight = 10;
  const plotWidth   = Math.max(0, containerWidth - marginLeft - marginRight);
  const n           = data.length;
  const binW        = n > 0 ? plotWidth / n : 0;

  const parseStart = (label: string) => parseFloat(label.split('-')[0]) || 0;

  const binIndexFor = (value: number) => {
    let best = 0;
    for (let i = 0; i < n; i++) {
      if (parseStart(data[i].binLabel) <= value) best = i;
    }
    return best;
  };

  const xFor = (value: number) =>
    marginLeft + binIndexFor(value) * binW + binW / 2;

  const meanX   = xFor(mean);
  const medianX = xFor(median);

  const paddingTop    = 10;
  const paddingBottom = 30;
  const lineTop       = paddingTop;
  const lineBottom    = height - paddingBottom;
  const close         = Math.abs(meanX - medianX) < 28;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <BarChart
        h={height}
        data={data}
        dataKey="binLabel"
        series={[{ name: 'count', color: 'blue.4', label: 'Students' }]}
        tickLine="xy"
        xAxisProps={{ tick: { fontSize: 10 } }}
        yAxisProps={{ tick: { fontSize: 10 }, allowDecimals: false }}
      />
      {containerWidth > 0 && (
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height, pointerEvents: 'none' }}
          aria-hidden
        >
          <line x1={medianX} x2={medianX} y1={lineTop} y2={lineBottom}
            stroke={C.median} strokeWidth={2} strokeDasharray="5 3" opacity={0.95} />
          <line x1={meanX} x2={meanX} y1={lineTop} y2={lineBottom}
            stroke={C.mean} strokeWidth={2} strokeDasharray="5 3" opacity={0.95} />

          {close ? (
            <>
              <text x={Math.max(meanX, medianX) + 5} y={lineTop + 11}
                fontSize={10} fontWeight={700} fill={C.mean}>Mean</text>
              <text x={Math.max(meanX, medianX) + 5} y={lineTop + 23}
                fontSize={10} fontWeight={700} fill={C.median}>Med</text>
            </>
          ) : (
            <>
              <text x={meanX + 5}   y={lineTop + 11} fontSize={10} fontWeight={700} fill={C.mean}>Mean</text>
              <text x={medianX + 5} y={lineTop + 11} fontSize={10} fontWeight={700} fill={C.median}>Med</text>
            </>
          )}
        </svg>
      )}
    </div>
  );
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
          <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }}>
            Score Histogram
          </Text>
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
        <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em' }} mb={10}>
          Box Plot
        </Text>
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

    </div>
  );
};

export default ResultsStatsPanel;