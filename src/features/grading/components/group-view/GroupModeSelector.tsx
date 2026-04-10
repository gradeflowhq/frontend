import {
  ActionIcon,
  Alert,
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
import { IconInfoCircle, IconSettings } from '@tabler/icons-react';
import React, { useState } from 'react';

import type { GroupingMode, NormalizeOpts } from '@features/grading/helpers/grouping';

export type SemanticState = 'idle' | 'loading-model' | 'computing' | 'ready';

interface GroupModeSelectorProps {
  mode: GroupingMode;
  onChange: (mode: GroupingMode) => void;
  useSemanticGrouping: boolean;
  onUseSemanticGroupingChange: (value: boolean) => void;
  /** The applied (committed) threshold used for clustering. */
  threshold: number;
  /** The current slider value (before Apply). */
  pendingThreshold: number;
  onPendingThresholdChange: (v: number) => void;
  onApplyThreshold: () => void;
  normalizeOpts: NormalizeOpts;
  onNormalizeOptsChange: (opts: NormalizeOpts) => void;
  isGroupsPending?: boolean;
  semanticState?: SemanticState;
}

const GroupModeSelector: React.FC<GroupModeSelectorProps> = ({
  mode,
  onChange,
  useSemanticGrouping,
  onUseSemanticGroupingChange,
  threshold,
  pendingThreshold,
  onPendingThresholdChange,
  onApplyThreshold,
  normalizeOpts,
  onNormalizeOptsChange,
  isGroupsPending = false,
  semanticState = 'idle',
}) => {
  const [similarityOpen, setSimilarityOpen] = useState(false);
  const hasUnappliedChange = pendingThreshold !== threshold;
  const isFuzzy = threshold < 1.0;
  const isSemantic = useSemanticGrouping;
  const isSemanticLoading = isSemantic && (semanticState === 'loading-model' || semanticState === 'computing');

  return (
    <Stack gap="sm">
      <Group align="center" gap="xs" wrap="wrap">
        <SegmentedControl
          value={mode}
          onChange={(v) => onChange(v as GroupingMode)}
          data={[
            { value: 'answer', label: 'By Answer' },
            { value: 'feedback', label: 'By Feedback' },
          ]}
          size="sm"
        />

        <Checkbox
          label="Semantic similarity"
          checked={useSemanticGrouping}
          onChange={(event) => onUseSemanticGroupingChange(event.currentTarget.checked)}
        />

        <Tooltip
          label={isSemantic
            ? `Semantic threshold: ${threshold.toFixed(2)}`
            : isFuzzy
              ? `Similarity: ${threshold.toFixed(2)}`
              : 'Similarity settings'}
          withArrow
        >
          <ActionIcon
            variant={isSemantic || isFuzzy || similarityOpen ? 'light' : 'subtle'}
            color={isSemantic || isFuzzy ? 'blue' : 'gray'}
            size="md"
            onClick={() => setSimilarityOpen((o) => !o)}
            aria-label={isSemantic ? 'Semantic similarity settings' : 'Similarity settings'}
          >
            <IconSettings size={16} />
          </ActionIcon>
        </Tooltip>

        {(isGroupsPending || isSemanticLoading) && <Loader size={20} />}
      </Group>

      {isSemantic && semanticState === 'loading-model' && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" py="xs">
          <Text size="sm">
            Downloading embedding model (~34 MB) — will be cached for future use.
          </Text>
        </Alert>
      )}

      {isSemantic && semanticState === 'computing' && (
        <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light" py="xs">
          <Text size="sm">Computing semantic embeddings for student answers…</Text>
        </Alert>
      )}

      {/* Similarity settings panel */}
      <Collapse expanded={similarityOpen}>
        <div style={{
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-sm)',
          padding: 'var(--mantine-spacing-md)',
          overflow: 'visible',
        }}>
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
            {!isSemantic && (
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
            )}
            {isSemantic && (
              <Text size="xs" c="dimmed">
                Apply embedding-based similarity to {mode === 'answer' ? 'student answers' : 'feedback comments'}. 0.85 is a good starting point for grouping similar meaning.
              </Text>
            )}
          </Stack>
        </div>
      </Collapse>
    </Stack>
  );
};

export default GroupModeSelector;
