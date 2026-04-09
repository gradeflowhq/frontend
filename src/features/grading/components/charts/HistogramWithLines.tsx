import { BarChart } from '@mantine/charts';
import React from 'react';

import { useContainerWidth } from '@hooks/useContainerWidth';

import { C } from './chartColors';

interface HistogramWithLinesProps {
  data: { binLabel: string; count: number }[];
  mean: number;
  median: number;
  height: number;
}

const HistogramWithLines: React.FC<HistogramWithLinesProps> = ({ data, mean, median, height }) => {
  const { ref: containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>();

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

export { HistogramWithLines };
export type { HistogramWithLinesProps };
