import { SimpleGrid, NumberInput, Select, Box, Button } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import React from 'react';

export type GradingPreviewParams = {
  limit: number;
  selection: 'first' | 'random';
  seed?: number | null;
};

type Props = {
  value: GradingPreviewParams;
  onChange: (next: GradingPreviewParams) => void;
  onRun?: () => Promise<void> | void;
  runLoading?: boolean;
};

const GradingPreviewSettings: React.FC<Props> = ({ value, onChange, onRun, runLoading }) => {
  const { limit, selection, seed } = value;
  return (
    <SimpleGrid cols={{ base: 1, md: onRun ? 4 : 3 }} spacing="sm">
      <NumberInput
        label="Limit"
        min={1}
        value={limit}
        onChange={(v) => onChange({ ...value, limit: Number(v) || 1 })}
      />
      <Select
        label="Selection"
        value={selection}
        onChange={(v) => onChange({ ...value, selection: v as 'first' | 'random' })}
        data={[
          { value: 'first', label: 'first' },
          { value: 'random', label: 'random' },
        ]}
      />
      <NumberInput
        label="Seed (optional)"
        value={seed ?? ''}
        onChange={(v) => onChange({ ...value, seed: v === '' ? null : Number(v) })}
        disabled={selection !== 'random'}
        placeholder="Only for random selection"
      />
      {onRun && (
        <Box style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            onClick={() => void onRun()}
            loading={!!runLoading}
            fullWidth
          >
            Run Preview
          </Button>
        </Box>
      )}
    </SimpleGrid>
  );
};

export default GradingPreviewSettings;
