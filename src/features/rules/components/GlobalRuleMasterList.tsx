import {
  Badge,
  Box,
  Button,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import React, { useCallback, useMemo } from 'react';

import { useScrollIntoView } from '@hooks/useScrollIntoView';

import type { RuleValue } from '../types';
import type { RuleTypeOption } from '@api/models';

// ── types ─────────────────────────────────────────────────────────────────────

interface GlobalRuleRowData {
  ruleId: string;
  label: string;
  coveredQids: string[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

const dotColor = (count: number) =>
  count > 0
    ? 'var(--mantine-color-green-6)'
    : 'var(--mantine-color-red-5)';

const MAX_VISIBLE_QID_BADGES = 8;

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  data: GlobalRuleRowData;
  isSelected: boolean;
  onSelect: (ruleId: string) => void;
}

const GlobalRuleRow: React.FC<RowProps> = ({ data, isSelected, onSelect }) => {
  const handleClick = useCallback(() => onSelect(data.ruleId), [data.ruleId, onSelect]);
  const hiddenQids = data.coveredQids.slice(MAX_VISIBLE_QID_BADGES);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(data.ruleId);
      }
    },
    [data.ruleId, onSelect],
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
        borderRight: '1px solid var(--mantine-color-default-border)',
        backgroundColor: isSelected ? 'var(--mantine-color-blue-light)' : undefined,
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
            {data.coveredQids.slice(0, MAX_VISIBLE_QID_BADGES).map((qid) => (
              <Badge key={qid} variant="outline" color="gray" ff="monospace" size="xs">
                {qid}
              </Badge>
            ))}
            {hiddenQids.length > 0 && (
              <Tooltip label={hiddenQids.join(', ')} multiline maw={360} withArrow>
                <Text size="xs" c="dimmed" ff="monospace" title={hiddenQids.join(', ')}>
                  +{hiddenQids.length}
                </Text>
              </Tooltip>
            )}
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
  selectedRuleId: string | null;
  onSelect: (ruleId: string) => void;
  onAdd: (ruleType: string) => void;
  addableRules: RuleTypeOption[];
  coveredQidsByRuleId: Record<string, string[]>;
  searchQuery?: string;
}

const GlobalRuleMasterList: React.FC<Props> = ({
  rules,
  selectedRuleId,
  onSelect,
  onAdd,
  addableRules,
  coveredQidsByRuleId,
  searchQuery = '',
}) => {
  const selectedRef = useScrollIntoView<HTMLDivElement>(selectedRuleId);

  const rows = useMemo((): GlobalRuleRowData[] => {
    const q = searchQuery.trim().toLowerCase();
    // Build base rows with labels
    const baseRows = rules.flatMap((rule) => {
      if (!rule.id || !rule.display_name) return [];
      const label = rule.display_name;
      const coveredQids = coveredQidsByRuleId[rule.id] ?? [];
      return [{ ruleId: rule.id, label, coveredQids }];
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
  }, [coveredQidsByRuleId, rules, searchQuery]);

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const currentIdx = rows.findIndex((r) => r.ruleId === selectedRuleId);
      const nextIdx =
        currentIdx === -1
          ? 0
          : e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, rows.length - 1)
          : Math.max(currentIdx - 1, 0);
      if (rows[nextIdx]) onSelect(rows[nextIdx].ruleId);
    },
    [rows, selectedRuleId, onSelect],
  );

  return (
    <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Add rule button — full width with spacing before the list */}
      <Box pb={4}>
        {addableRules.length === 1 ? (
          <Button
            size="xs"
            leftSection={<IconPlus size={12} />}
            onClick={() => onAdd(addableRules[0]!.type)}
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
              {addableRules.map((rule) => (
                <Menu.Item key={rule.type} onClick={() => onAdd(rule.type)}>
                  {rule.label}
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
              key={row.ruleId}
              ref={row.ruleId === selectedRuleId ? selectedRef : undefined}
            >
              <GlobalRuleRow
                data={row}
                isSelected={row.ruleId === selectedRuleId}
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
