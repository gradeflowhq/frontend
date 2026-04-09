import { Box, Group, Text } from '@mantine/core';
import React from 'react';

import { C } from './chartColors';

interface BoxPlotStripProps {
  min: number;
  q1: number;
  median: number;
  mean: number;
  q3: number;
  max: number;
}

const BoxPlotStrip: React.FC<BoxPlotStripProps> = ({ min, q1, median, mean, q3, max }) => {
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

export { BoxPlotStrip };
export type { BoxPlotStripProps };
