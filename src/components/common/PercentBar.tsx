import React from 'react';

type Props = { value: number; max: number; width?: number };

const PercentBar: React.FC<Props> = ({ value, max, width = 96 }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <progress
        className="progress progress-primary"
        style={{ width }}
        value={pct}
        max={100}
      />
      <span className="text-xs font-mono">{pct}%</span>
    </div>
  );
};

export default PercentBar;