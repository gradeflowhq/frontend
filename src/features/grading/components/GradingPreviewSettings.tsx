import React from 'react';

export type GradingPreviewParams = {
  limit: number;
  selection: 'first' | 'random';
  seed?: number | null;
};

type Props = {
  value: GradingPreviewParams;
  onChange: (next: GradingPreviewParams) => void;
  className?: string;
};

const GradingPreviewSettings: React.FC<Props> = ({ value, onChange, className }) => {
  const { limit, selection, seed } = value;
  return (
    <div tabIndex={0} className={`card bg-base-100 border border-base-300 shadow-xs p-3 ${className ?? ''}`}>
      <h4 className="font-semibold mb-2">Preview Settings</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text">Limit</span></label>
          <input
            type="number"
            min={1}
            className="input input-bordered w-full"
            value={limit}
            onChange={(e) =>
              onChange({ ...value, limit: Number(e.target.value) || 1 })
            }
          />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Selection</span></label>
          <select
            className="select select-bordered w-full"
            value={selection}
            onChange={(e) =>
              onChange({ ...value, selection: e.target.value as 'first' | 'random' })
            }
          >
            <option value="first">first</option>
            <option value="random">random</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Seed (optional)</span></label>
          <input
            type="number"
            className="input input-bordered w-full"
            value={seed ?? ''}
            onChange={(e) =>
              onChange({ ...value, seed: e.target.value === '' ? null : Number(e.target.value) })
            }
            disabled={selection !== 'random'}
            placeholder="Only for random selection"
          />
        </div>
      </div>
    </div>
  );
};

export default GradingPreviewSettings;