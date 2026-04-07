import {
  ActionIcon,
  Button,
  Checkbox,
  Collapse,
  Group,
  Loader,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import React, { useState } from 'react';

import type { GroupingMode, NormalizeOpts } from '@features/grading/helpers/grouping';

interface GroupModeSelectorProps {
  mode: GroupingMode;
  onChange: (mode: GroupingMode) => void;
  /** The applied (committed) threshold used for clustering. */
  threshold: number;
  /** The current slider value (before Apply). */
  pendingThreshold: number;
  onPendingThresholdChange: (v: number) => void;
  onApplyThreshold: () => void;
  normalizeOpts: NormalizeOpts;
  onNormalizeOptsChange: (opts: NormalizeOpts) => void;
  isGroupsPending?: boolean;
}

const GroupModeSelector: React.FC<GroupModeSelectorProps> = ({
  mode,
  onChange,
  threshold,
  pendingThreshold,
  onPendingThresholdChange,
  onApplyThreshold,
  normalizeOpts,
  onNormalizeOptsChange,
  isGroupsPending = false,
}) => {
  const [similarityOpen, setSimilarityOpen] = useState(false);
  const hasUnappliedChange = pendingThreshold !== threshold;
  const isFuzzy = threshold < 1.0;

  return (
    <Stack gap="sm">
      <Group align="center" gap="xs">
        <SegmentedControl
          value={mode}
          onChange={(v) => onChange(v as GroupingMode)}
          data={[
            { value: 'answer', label: 'By Answer' },
            { value: 'feedback', label: 'By Feedback' },
          ]}
          size="sm"
        />

        {/* Similarity settings toggle — available for both modes */}
        <Tooltip
          label={isFuzzy ? `Similarity: ${threshold.toFixed(2)}` : 'Similarity settings'}
          withArrow
        >
          <ActionIcon
            variant={isFuzzy || similarityOpen ? 'light' : 'subtle'}
            color={isFuzzy ? 'blue' : 'gray'}
            size="md"
            onClick={() => setSimilarityOpen((o) => !o)}
            aria-label="Similarity settings"
          >
            <IconSettings size={16} />
          </ActionIcon>
        </Tooltip>

        { isGroupsPending && <Loader size={20} /> }
      </Group>

      {/* Similarity settings panel (applies to both By Answer and By Feedback) */}
      <Collapse expanded={similarityOpen}>
        <Stack gap="sm" pt="xs" pb="xs">
          <Group justify="space-between" align="center">
            <Text size="sm">
              Similarity threshold
              {hasUnappliedChange && (
                <Text component="span" size="xs" c="dimmed" ml={4}>
                  (applied: {threshold.toFixed(2)})
                </Text>
              )}
            </Text>
            <Button
              size="xs"
              variant={hasUnappliedChange ? 'filled' : 'default'}
              onClick={onApplyThreshold}
            >
              Apply
            </Button>
          </Group>
          <Slider
            min={0}
            max={1.0}
            step={0.05}
            label={(v) => v.toFixed(2)}
            value={pendingThreshold}
            onChange={onPendingThresholdChange}
            marks={[
              { value: 0, label: '0.00' },
              { value: 0.5, label: '0.50' },
              { value: 0.85, label: '0.85' },
              { value: 1.0, label: '1.00' },
            ]}
            mb="md"
          />
          <Group gap="md">
            <Checkbox
              label="Ignore case"
              checked={normalizeOpts.ignoreCase}
              onChange={(e) =>
                onNormalizeOptsChange({ ...normalizeOpts, ignoreCase: e.currentTarget.checked })
              }
            />
            <Checkbox
              label="Ignore whitespace"
              checked={normalizeOpts.ignoreWhitespace}
              onChange={(e) =>
                onNormalizeOptsChange({
                  ...normalizeOpts,
                  ignoreWhitespace: e.currentTarget.checked,
                })
              }
            />
            <Checkbox
              label="Ignore punctuation"
              checked={normalizeOpts.ignorePunctuation}
              onChange={(e) =>
                onNormalizeOptsChange({
                  ...normalizeOpts,
                  ignorePunctuation: e.currentTarget.checked,
                })
              }
            />
          </Group>
        </Stack>
      </Collapse>
    </Stack>
  );
};

export default GroupModeSelector;
