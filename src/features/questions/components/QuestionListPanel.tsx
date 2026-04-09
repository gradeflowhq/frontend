import { Badge, Box, ScrollArea, Stack, Text } from '@mantine/core';
import React, { useCallback, useMemo } from 'react';

import { QUESTION_TYPE_COLORS } from '@features/questions/constants';
import { useScrollIntoView } from '@hooks/useScrollIntoView';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  questionIds: string[];
  questionTypesById: Record<string, string>;
  selectedQid: string | null;
  onSelect: (qid: string) => void;
  searchQuery?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

const QuestionListPanel: React.FC<Props> = ({
  questionIds,
  questionTypesById,
  selectedQid,
  onSelect,
  searchQuery = '',
}) => {
  const selectedRef = useScrollIntoView<HTMLDivElement>(selectedQid);

  const filteredIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return questionIds;
    return questionIds.filter((qid) => {
      const type = (questionTypesById[qid] ?? '').toLowerCase();
      return qid.toLowerCase().includes(q) || type.includes(q);
    });
  }, [questionIds, questionTypesById, searchQuery]);

  // Arrow-key navigation across the filtered list.
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const currentIndex = filteredIds.indexOf(selectedQid ?? '');
      if (currentIndex === -1) {
        if (filteredIds[0]) onSelect(filteredIds[0]);
        return;
      }
      const nextIndex =
        e.key === 'ArrowDown'
          ? Math.min(currentIndex + 1, filteredIds.length - 1)
          : Math.max(currentIndex - 1, 0);
      if (filteredIds[nextIndex]) onSelect(filteredIds[nextIndex]);
    },
    [filteredIds, selectedQid, onSelect],
  );

  return (
    <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScrollArea style={{ flex: 1 }}>
        <Box role="listbox" aria-label="Questions" onKeyDown={handleListKeyDown} py={4}>
          {filteredIds.length === 0 && (
            <Text size="sm" c="dimmed" px="sm" py="xs">
              No questions match.
            </Text>
          )}
          {filteredIds.map((qid) => {
            const isSelected = qid === selectedQid;
            const type = questionTypesById[qid] ?? 'TEXT';
            return (
              <Box
                key={qid}
                ref={qid === selectedQid ? selectedRef : undefined}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => onSelect(qid)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(qid);
                  }
                }}
                px="sm"
                py="xs"
                style={{
                  cursor: 'pointer',
                  borderLeft: `4px solid ${
                    isSelected ? 'var(--mantine-color-blue-5)' : 'transparent'
                  }`,
                  borderRight: '1px solid var(--mantine-color-gray-2)',
                  backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined,
                  outline: 'none',
                  transition: 'background-color 90ms ease',
                }}
              >
                <Stack gap={2}>
                  <Text
                    ff="monospace"
                    size="xs"
                    fw={isSelected ? 700 : 500}
                    truncate
                    c={isSelected ? 'blue.7' : undefined}
                  >
                    {qid}
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color={QUESTION_TYPE_COLORS[type] ?? 'gray'}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {type}
                  </Badge>
                </Stack>
              </Box>
            );
          })}
        </Box>
      </ScrollArea>
    </Box>
  );
};

export default QuestionListPanel;
