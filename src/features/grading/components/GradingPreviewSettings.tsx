import { Card, Text, SimpleGrid, NumberInput, Select } from '@mantine/core';
import React from 'react';

export type GradingPreviewParams = {
  limit: number;
  selection: 'first' | 'random';
  seed?: number | null;
};

type Props = {
  value: GradingPreviewParams;
  onChange: (next: GradingPreviewParams) => void;
};

const GradingPreviewSettings: React.FC<Props> = ({ value, onChange }) => {
  const { limit, selection, seed } = value;
  return (
    <Card withBorder shadow="xs" p="md">
      <Text fw={600} mb="sm">Preview Settings</Text>
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
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
      </SimpleGrid>
    </Card>
  );
};

export default GradingPreviewSettings;
