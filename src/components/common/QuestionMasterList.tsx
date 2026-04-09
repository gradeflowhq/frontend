import {
  Box, Group, ScrollArea, Stack, Text,
} from '@mantine/core';
import React, { useCallback, useMemo } from 'react';

import { computeQuestionPassRate } from '@features/grading/helpers';
import { useScrollIntoView } from '@hooks/useScrollIntoView';

import type { RuleValue } from '../../features/rules/types';
import type { AdjustableSubmission } from '@api/models';

// ── Sub-types ────────────────────────────────────────────────────────────────

type CoverageStatus = 'covered' | 'global' | 'uncovered';

interface QuestionMasterRowData {
  qid: string;
  coverageStatus: CoverageStatus;
  passRate: number | null;
}

// ── Coverage dot ─────────────────────────────────────────────────────────────

const COVERAGE_COLORS: Record<CoverageStatus, string> = {
  covered: 'var(--mantine-color-green-6)',
  global: 'var(--mantine-color-blue-4)',
  uncovered: 'var(--mantine-color-red-5)',
};

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  data: QuestionMasterRowData;
  isSelected: boolean;
  onSelect: (qid: string) => void;
}

const QuestionMasterRow: React.FC<RowProps> = ({ data, isSelected, onSelect }) => {
  const handleClick = useCallback((): void => {
    onSelect(data.qid);
  }, [data.qid, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(data.qid);
      }
    },
    [data.qid, onSelect],
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
        position: 'relative',
        borderLeft: `4px solid ${COVERAGE_COLORS[data.coverageStatus]}`,
        borderRight: `1px solid var(--mantine-color-gray-2)`,
        backgroundColor: isSelected
          ? 'var(--mantine-color-blue-0)'
          : undefined,
        // borderRadius: '0 6px 6px 0',
        outline: 'none',
        transition: 'background-color 90ms ease',
      }}
    >
  <Group gap="xs" wrap="nowrap" align="center">
    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
      <Text
        ff="monospace"
        size="xs"
        fw={isSelected ? 700 : 500}
        truncate
        c={isSelected ? 'blue.7' : undefined}
      >
        {data.qid}
      </Text>
      {data.passRate !== null && (
        <Text size="xs" c="dimmed" ff="monospace">
          {Math.round(data.passRate * 100)}% pass
        </Text>
      )}
    </Stack>
  </Group>
</Box>
  );
};

// ── Master list ───────────────────────────────────────────────────────────────

interface Props {
  questionIds: string[];
  questionTypesById: Record<string, string>;
  byQuestion: Record<string, RuleValue[]>;
  coveredQuestionIds: Set<string>;
  coveringRuleByQid: Record<string, RuleValue>;
  selectedQid: string | null;
  onSelect: (qid: string) => void;
  searchQuery: string;
  gradingItems?: AdjustableSubmission[];
  totalStudents?: number;
}

const QuestionMasterList: React.FC<Props> = ({
  questionIds,
  questionTypesById,
  byQuestion,
  coveredQuestionIds,
  coveringRuleByQid,
  selectedQid,
  onSelect,
  searchQuery,
  gradingItems,
  totalStudents = 0,
}) => {
  const selectedRef = useScrollIntoView<HTMLDivElement>(selectedQid);

  const rows = useMemo((): QuestionMasterRowData[] => {
    const q = searchQuery.trim().toLowerCase();
    return questionIds
      .filter((qid) => {
        if (!q) return true;
        const type = (questionTypesById[qid] ?? '').toLowerCase();
        return qid.toLowerCase().includes(q) || type.includes(q);
      })
      .map((qid) => {
        const rules = byQuestion[qid] ?? [];
        const hasDirectRules = rules.length > 0;
        const isCoveredByGlobal =
          !hasDirectRules && coveredQuestionIds.has(qid) && !!coveringRuleByQid[qid];
        const isCovered = hasDirectRules || coveredQuestionIds.has(qid);

        const coverageStatus: CoverageStatus = hasDirectRules
          ? 'covered'
          : isCoveredByGlobal
          ? 'global'
          : isCovered
          ? 'covered'
          : 'uncovered';

        const passRate =
          gradingItems && totalStudents > 0
            ? computeQuestionPassRate(gradingItems, qid, totalStudents)
            : null;

        return {
          qid,
          coverageStatus,
          passRate,
        };
      });
  }, [
    questionIds,
    questionTypesById,
    byQuestion,
    coveredQuestionIds,
    coveringRuleByQid,
    searchQuery,
    gradingItems,
    totalStudents,
  ]);

  // Keyboard navigation: arrow keys move selection within the filtered list
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const currentIndex = rows.findIndex((r) => r.qid === selectedQid);
      if (currentIndex === -1) {
        if (rows[0]) onSelect(rows[0].qid);
        return;
      }
      const nextIndex =
        e.key === 'ArrowDown'
          ? Math.min(currentIndex + 1, rows.length - 1)
          : Math.max(currentIndex - 1, 0);
      if (rows[nextIndex]) onSelect(rows[nextIndex].qid);
    },
    [rows, selectedQid, onSelect],
  );

  return (
    <Box
      style={{
        width: "100%",
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* List */}
      <ScrollArea style={{ flex: 1 }}>
        <Box
          role="listbox"
          aria-label="Questions"
          onKeyDown={handleListKeyDown}
          py={4}
        >
          {rows.length === 0 && (
            <Text size="sm" c="dimmed" px="sm" py="xs">
              No questions match.
            </Text>
          )}
          {rows.map((row) => (
            <Box
              key={row.qid}
              ref={row.qid === selectedQid ? selectedRef : undefined}
            >
              <QuestionMasterRow
                data={row}
                isSelected={row.qid === selectedQid}
                onSelect={onSelect}
              />
            </Box>
          ))}
        </Box>
      </ScrollArea>
    </Box>
  );
};

export default QuestionMasterList;
