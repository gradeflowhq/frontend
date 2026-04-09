import {
  Badge,
  Box,
  Button,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import React, { useCallback, useMemo } from 'react';

import { friendlyRuleLabel, getRuleTargetQids } from '@features/rules/schema';
import { useScrollIntoView } from '@hooks/useScrollIntoView';

import type { RuleValue } from '../types';

// ── types ─────────────────────────────────────────────────────────────────────

interface GlobalRuleRowData {
  /** Position in the filtered rows array — used for keyboard nav. */
  index: number;
  label: string;
  coveredQids: string[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

const dotColor = (count: number) =>
  count > 0
    ? 'var(--mantine-color-green-6)'
    : 'var(--mantine-color-red-5)';

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  data: GlobalRuleRowData;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

const GlobalRuleRow: React.FC<RowProps> = ({ data, isSelected, onSelect }) => {
  const handleClick = useCallback(() => onSelect(data.index), [data.index, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(data.index);
      }
    },
    [data.index, onSelect],
  );

  return (
    <Box
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      px="sm"
      py="xs"
      style={{
        cursor: 'pointer',
        borderLeft: `4px solid ${dotColor(data.coveredQids.length)}`,
        borderRight: '1px solid var(--mantine-color-gray-2)',
        backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined,
        outline: 'none',
        transition: 'background-color 90ms ease',
      }}
    >
      <Stack gap={4} style={{ minWidth: 0 }}>
        <Text
          size="xs"
          fw={isSelected ? 700 : 500}
          truncate
          c={isSelected ? 'blue.7' : undefined}
        >
          {data.label}
        </Text>
        {data.coveredQids.length > 0 ? (
          <Group gap={4} wrap="wrap">
            {data.coveredQids.map((qid) => (
              <Badge key={qid} variant="outline" color="gray" ff="monospace" size="xs">
                {qid}
              </Badge>
            ))}
          </Group>
        ) : (
          <Text size="xs" c="dimmed" ff="monospace">
            No questions covered
          </Text>
        )}
      </Stack>
    </Box>
  );
};

// ── Master list ───────────────────────────────────────────────────────────────

interface Props {
  rules: RuleValue[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onAdd: (ruleKey: string) => void;
  addableRuleKeys: string[];
  searchQuery?: string;
}

const GlobalRuleMasterList: React.FC<Props> = ({
  rules,
  selectedIndex,
  onSelect,
  onAdd,
  addableRuleKeys,
  searchQuery = '',
}) => {
  const selectedRef = useScrollIntoView<HTMLDivElement>(selectedIndex);

  const rows = useMemo((): GlobalRuleRowData[] => {
    const q = searchQuery.trim().toLowerCase();
    // Build base rows with labels
    const baseRows = rules.map((rule, index) => {
      const ruleType = String((rule as { type?: unknown }).type ?? '');
      const label = friendlyRuleLabel(ruleType);
      const coveredQids = getRuleTargetQids(rule);
      return { index, label, coveredQids };
    });
    // Append a sequence number when multiple rules share the same label
    const labelCounts: Record<string, number> = {};
    for (const row of baseRows) {
      labelCounts[row.label] = (labelCounts[row.label] ?? 0) + 1;
    }
    const labelSeenSoFar: Record<string, number> = {};
    const numberedRows = baseRows.map((row) => {
      if (labelCounts[row.label]! > 1) {
        const n = (labelSeenSoFar[row.label] ?? 0) + 1;
        labelSeenSoFar[row.label] = n;
        return { ...row, label: `${row.label} (${n})` };
      }
      return row;
    });
    return numberedRows.filter(({ label }) => !q || label.toLowerCase().includes(q));
  }, [rules, searchQuery]);

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const currentIdx = rows.findIndex((r) => r.index === selectedIndex);
      const nextIdx =
        currentIdx === -1
          ? 0
          : e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, rows.length - 1)
          : Math.max(currentIdx - 1, 0);
      if (rows[nextIdx]) onSelect(rows[nextIdx].index);
    },
    [rows, selectedIndex, onSelect],
  );

  return (
    <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Add rule button — full width, flush with panel edges */}
      <Box style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        {addableRuleKeys.length === 1 ? (
          <Button
            size="xs"
            leftSection={<IconPlus size={12} />}
            onClick={() => onAdd(addableRuleKeys[0]!)}
            fullWidth
          >
            Add rule
          </Button>
        ) : (
          <Menu position="bottom-start" withinPortal width="target">
            <Menu.Target>
              <Button
                size="xs"
                leftSection={<IconPlus size={12} />}
                fullWidth
              >
                Add rule
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {addableRuleKeys.map((key) => (
                <Menu.Item key={key} onClick={() => onAdd(key)}>
                  {friendlyRuleLabel(key)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}
      </Box>

      {/* Rule list */}
      <ScrollArea style={{ flex: 1 }}>
        <Box
          role="listbox"
          aria-label="Global rules"
          onKeyDown={handleListKeyDown}
          py={4}
        >
          {rows.length === 0 && (
            <Text size="xs" c="dimmed" ta="center">
              {rules.length === 0 ? 'No global rules yet.' : 'No rules match.'}
            </Text>
          )}
          {rows.map((row) => (
            <Box
              key={row.index}
              ref={row.index === selectedIndex ? selectedRef : undefined}
            >
              <GlobalRuleRow
                data={row}
                isSelected={row.index === selectedIndex}
                onSelect={onSelect}
              />
            </Box>
          ))}
        </Box>
      </ScrollArea>
    </Box>
  );
};

export default GlobalRuleMasterList;
