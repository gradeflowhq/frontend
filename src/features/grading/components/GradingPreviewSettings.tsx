import { SimpleGrid, NumberInput, Select, Box, Button, Group } from '@mantine/core';
import { IconPlayerPlay, IconX } from '@tabler/icons-react';
import React from 'react';

import {
  GRADING_PREVIEW_LIMIT_OPTIONS,
  GRADING_PREVIEW_SELECTION_OPTIONS,
} from '@features/grading/previewConfig';

import type { GradingLimitConfigSelection } from '@api/models';

export type GradingPreviewParams = {
  limit: number;
  selection: GradingLimitConfigSelection;
  seed?: number | null;
};

type WithRun = {
  onRun: () => Promise<void> | void;
  runLoading?: boolean;
  onCancel?: () => void;
  cancelLoading?: boolean;
};

type WithoutRun = {
  onRun?: never;
  runLoading?: never;
  onCancel?: never;
  cancelLoading?: never;
};

type Props = {
  value: GradingPreviewParams;
  onChange: (next: GradingPreviewParams) => void;
} & (WithRun | WithoutRun);

const GradingPreviewSettings: React.FC<Props> = ({ value, onChange, onRun, runLoading, onCancel, cancelLoading }) => {
  const { limit, selection, seed } = value;

  return (
    <SimpleGrid cols={{ base: 1, md: onRun ? 4 : 3 }} spacing="sm">
      <Select
        label="Limit"
        value={String(limit)}
        onChange={(v) => {
          if (v) onChange({ ...value, limit: Number(v) });
        }}
        data={GRADING_PREVIEW_LIMIT_OPTIONS}
      />
      <Select
        label="Selection"
        value={selection}
        onChange={(v) => {
          if (v) onChange({ ...value, selection: v as GradingLimitConfigSelection });
        }}
        data={GRADING_PREVIEW_SELECTION_OPTIONS}
      />
      <NumberInput
        label="Seed (optional)"
        value={seed ?? ''}
        onChange={(v) => onChange({ ...value, seed: v === '' ? null : Number(v) })}
        disabled={selection === 'first'}
        placeholder="Only for random selections"
      />
      {onRun && (
        <Box style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Group gap="xs" style={{ width: '100%' }}>
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => void onRun()}
              loading={!!runLoading}
              disabled={!!runLoading}
              style={{ flex: 1 }}
            >
              Run Preview
            </Button>
            {runLoading && onCancel && (
              <Button
                color="red"
                variant="light"
                leftSection={<IconX size={16} />}
                onClick={onCancel}
                loading={cancelLoading}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            )}
          </Group>
        </Box>
      )}
    </SimpleGrid>
  );
};

export default GradingPreviewSettings;
