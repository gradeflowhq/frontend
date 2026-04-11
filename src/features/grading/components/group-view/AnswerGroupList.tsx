import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Pagination,
  Popover,
  Stack,
  Text,
  Textarea,
  Tooltip,
  useComputedColorScheme,
} from '@mantine/core';
import { IconEraser, IconGitMerge } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useState } from 'react';

import AnswerText from '@components/common/AnswerText';
import DecryptedText from '@features/encryption/components/DecryptedText';

import BulkAdjustPopover from './BulkAdjustPopover';

import type { BulkAdjustArgs } from './BulkAdjustPopover';
import type { AnswerGroup, GroupEntry } from '@features/grading/helpers/grouping';

// Number of entries to render per page inside each accordion group
const GROUP_PAGE_SIZE = 50;

interface AnswerGroupListProps {
  groups: AnswerGroup[];
  maxPoints: number;
  onBulkAdjust: (group: AnswerGroup, args: BulkAdjustArgs) => void;
  onBulkRemove: (group: AnswerGroup) => void;
  onIndividualAdjust: (
    studentId: string,
    args: { points: number | null; feedback: string | null },
  ) => Promise<void>;
  bulkLoadingKey: string | null;
  individualLoadingId: string | null;
  passphrase: string | null;
  onEncryptedDetected?: () => void;
}

type EditDraft = { points: number | string; feedback: string };

const AnswerGroupList: React.FC<AnswerGroupListProps> = ({
  groups,
  maxPoints,
  onBulkAdjust,
  onBulkRemove,
  onIndividualAdjust,
  bulkLoadingKey,
  individualLoadingId,
  passphrase,
  onEncryptedDetected,
}) => {
  const [editingMap, setEditingMap] = useState<Record<string, EditDraft>>({});
  const [openEdits, setOpenEdits] = useState<Set<string>>(new Set());
  const [openItems, setOpenItems] = useState<string[]>([]);
  // Per-group current page (1-indexed)
  const [groupPages, setGroupPages] = useState<Record<string, number>>({});
  // Confirm modal for bulk remove
  const [confirmRemoveGroup, setConfirmRemoveGroup] = useState<AnswerGroup | null>(null);
  const colorScheme = useComputedColorScheme('light');
  const adjustmentRowBackground = colorScheme === 'dark' ? 'var(--mantine-color-yellow-light)' : 'var(--mantine-color-yellow-0)';

  const startEdit = (entry: GroupEntry) => {
    setEditingMap((prev) => ({
      ...prev,
      [entry.studentId]: {
        points: entry.effectivePoints,
        feedback: entry.effectiveFeedback ?? '',
      },
    }));
    setOpenEdits((prev) => new Set([...prev, entry.studentId]));
  };

  const cancelEdit = (studentId: string) => {
    setEditingMap((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setOpenEdits((prev) => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  };

  const saveEdit = async (entry: GroupEntry) => {
    const draft = editingMap[entry.studentId];
    if (!draft) return;
    await onIndividualAdjust(entry.studentId, {
      points: draft.points === '' ? entry.effectivePoints : Number(draft.points),
      feedback: (draft.feedback ?? '').trim() === '' ? entry.effectiveFeedback : draft.feedback.trim(),
    });
    cancelEdit(entry.studentId);
  };

  if (groups.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No submissions for this question.
      </Text>
    );
  }

  const getPointsBadgeColor = (group: AnswerGroup): string => {
    if (group.isUniform && group.pointsMax === maxPoints) return 'green';
    if (group.isUniform && group.pointsMax === 0) return 'red';
    if (group.isUniform) return 'yellow';
    return 'orange';
  };

  const getPointsBadgeLabel = (group: AnswerGroup): string => {
    if (group.isUniform) return `${group.pointsMax} / ${maxPoints}`;
    return `${group.pointsMin}–${group.pointsMax} / ${maxPoints}`;
  };

  return (
    <>
    <Accordion
      value={openItems}
      onChange={setOpenItems}
      variant="separated"
      multiple
      chevronPosition="left"
    >
      {groups.map((group) => {
        const currentPage = groupPages[group.key] ?? 1;
        const totalPages = Math.ceil(group.entries.length / GROUP_PAGE_SIZE);
        const pageRecords = group.entries.slice(
          (currentPage - 1) * GROUP_PAGE_SIZE,
          currentPage * GROUP_PAGE_SIZE,
        );

        return (
          <Accordion.Item key={group.key} value={group.key}>
            <Accordion.Control>
              <Group justify="space-between" wrap="nowrap" w="100%">
                <Group gap="xs">
                  <Badge variant="filled" color={getPointsBadgeColor(group)}>
                    {getPointsBadgeLabel(group)}
                  </Badge>
                  <Text
                    size="sm"
                    fw={500}
                    title={group.label}
                    style={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {group.label.length > 80 ? `${group.label.slice(0, 80)}…` : group.label}
                  </Text>
                  {group.mergedAnswers && group.mergedAnswers.length > 0 && (
                    // stopPropagation on wrapper prevents accordion toggle when interacting with the popover
                    <span onClick={(e) => e.stopPropagation()}>
                      <Popover width={320} withinPortal shadow="md" position="bottom-start">
                        <Popover.Target>
                          <Badge
                            size="xs"
                            variant="light"
                            color="blue"
                            leftSection={<IconGitMerge size={10} />}
                            style={{ cursor: 'pointer' }}
                          >
                            {group.mergedAnswers.length} variants
                          </Badge>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <Stack gap="xs">
                            <Text size="xs" fw={600} c="dimmed">
                              Merged similar {group.mode === 'answer' ? 'answers' : 'feedback'} ({group.mergedAnswers.length}):
                            </Text>
                            {group.mergedAnswers.map((answer, i) => (
                              <Text key={`${i}:${answer}`} size="xs" ff="monospace" style={{ wordBreak: 'break-word' }}>
                                {answer || <Text component="span" c="dimmed">(empty)</Text>}
                              </Text>
                            ))}
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                    </span>
                  )}
                </Group>

                <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                  <Text size="xs" c="dimmed">
                    {group.entries.length} students
                    {group.adjustmentCount > 0 && ` · ${group.adjustmentCount} adjusted`}
                  </Text>
                  {group.adjustmentCount > 0 && (
                    <Tooltip label="Remove adjustments for this group" withArrow>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        aria-label="Remove adjustments"
                        loading={bulkLoadingKey === `remove-${group.key}`}
                        onClick={() => setConfirmRemoveGroup(group)}
                      >
                        <IconEraser size={13} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <BulkAdjustPopover
                    key={group.key}
                    group={group}
                    maxPoints={maxPoints}
                    onApply={(args) => onBulkAdjust(group, args)}
                    isLoading={bulkLoadingKey === group.key}
                  />
                </Group>
              </Group>
            </Accordion.Control>

            <Accordion.Panel>
              {openItems.includes(group.key) && (
                <Stack gap="xs">
                  <Box
                    style={{
                      border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 'var(--mantine-radius-md)',
                      overflow: 'hidden',
                      background: 'var(--mantine-color-body)',
                    }}
                  >
                    <DataTable
                      idAccessor="studentId"
                      records={pageRecords}
                      withTableBorder={false}
                      striped
                      scrollAreaProps={{ h: 320, type: 'hover' }}
                      rowStyle={(entry) =>
                        (entry as GroupEntry).hasManualAdjustment
                          ? { background: adjustmentRowBackground }
                          : undefined
                      }
                      columns={[
                        {
                          accessor: 'studentId',
                          title: 'Student ID',
                          render: (entry) => (
                            <DecryptedText
                              value={(entry as GroupEntry).studentId}
                              passphrase={passphrase}
                              size="xs"
                              mono
                              onEncryptedDetected={onEncryptedDetected}
                            />
                          ),
                        },
                        {
                          accessor: 'rawAnswer',
                          title: 'Answer',
                          render: (entry) => (
                            <AnswerText value={(entry as GroupEntry).rawAnswer} maxLength={120} />
                          ),
                        },
                        {
                          accessor: 'effectivePoints',
                          title: 'Points',
                          render: (entry) => {
                            const e = entry as GroupEntry;
                            if (openEdits.has(e.studentId)) {
                              return (
                                <Group gap="xs" align="center">
                                  <NumberInput
                                    size="xs"
                                    w={80}
                                    aria-label="Points"
                                    value={editingMap[e.studentId]?.points ?? ''}
                                    onChange={(v) =>
                                      setEditingMap((prev) => ({
                                        ...prev,
                                        [e.studentId]: { ...prev[e.studentId]!, points: v },
                                      }))
                                    }
                                    min={0}
                                    max={e.maxPoints}
                                    step={0.5}
                                    placeholder="pts"
                                  />
                                  <Text c="dimmed" size="xs">
                                    / {e.maxPoints}
                                  </Text>
                                </Group>
                              );
                            }
                            return (
                              <Stack gap={2}>
                                <Group gap={4} align="baseline">
                                  <Text ff="monospace" size="sm">
                                    {e.effectivePoints.toFixed(2)}
                                  </Text>
                                  <Text c="dimmed" size="xs">
                                    / {e.maxPoints}
                                  </Text>
                                </Group>
                                {e.hasManualAdjustment &&
                                  e.effectivePoints !== e.originalPoints && (
                                    <Text size="xs" c="dimmed" ff="monospace">
                                      orig: {e.originalPoints.toFixed(2)}
                                    </Text>
                                  )}
                              </Stack>
                            );
                          },
                        },
                        {
                          accessor: 'effectiveFeedback',
                          title: 'Feedback',
                          render: (entry) => {
                            const e = entry as GroupEntry;
                            if (openEdits.has(e.studentId)) {
                              return (
                                <Textarea
                                  size="xs"
                                  value={editingMap[e.studentId]?.feedback ?? ''}
                                  onChange={(ev) => {
                                    // Read value synchronously before setState to prevent
                                    // accessing ev.currentTarget after DOM event dispatch.
                                    const value = ev.currentTarget.value;
                                    setEditingMap((prev) => ({
                                      ...prev,
                                      [e.studentId]: {
                                        ...(prev[e.studentId] ?? {
                                          points: e.effectivePoints,
                                          feedback: '',
                                        }),
                                        feedback: value,
                                      },
                                    }));
                                  }}
                                  autosize
                                  minRows={1}
                                  maxRows={4}
                                  placeholder="Feedback"
                                />
                              );
                            }
                            return (
                              <Stack gap={4}>
                                <Text
                                  size="xs"
                                  style={{ whiteSpace: 'pre-wrap' }}
                                  lineClamp={2}
                                >
                                  {e.effectiveFeedback ?? (
                                    <Text component="span" c="dimmed">
                                      —
                                    </Text>
                                  )}
                                </Text>
                                {e.hasManualAdjustment &&
                                  e.effectiveFeedback !== e.originalFeedback && (
                                    <Badge size="xs" variant="light" color="yellow">
                                      adjusted
                                    </Badge>
                                  )}
                              </Stack>
                            );
                          },
                        },
                        {
                          accessor: 'actions',
                          title: '',
                          render: (entry) => {
                            const e = entry as GroupEntry;
                            if (openEdits.has(e.studentId)) {
                              return (
                                <Group gap="xs">
                                  <Button
                                    size="xs"
                                    loading={individualLoadingId === e.studentId}
                                    onClick={() => void saveEdit(e)}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="default"
                                    disabled={individualLoadingId === e.studentId}
                                    onClick={() => cancelEdit(e.studentId)}
                                  >
                                    Cancel
                                  </Button>
                                </Group>
                              );
                            }
                            return (
                              <Button
                                size="xs"
                                variant="subtle"
                                loading={individualLoadingId === e.studentId}
                                onClick={() => startEdit(e)}
                              >
                                Edit
                              </Button>
                            );
                          },
                        },
                      ]}
                    />
                  </Box>
                  {totalPages > 1 && (
                    <Group justify="space-between" align="center" px="xs">
                      <Text size="xs" c="dimmed">
                        {(currentPage - 1) * GROUP_PAGE_SIZE + 1}–
                        {Math.min(currentPage * GROUP_PAGE_SIZE, group.entries.length)} of{' '}
                        {group.entries.length}
                      </Text>
                      <Pagination
                        size="xs"
                        total={totalPages}
                        value={currentPage}
                        onChange={(page) =>
                          setGroupPages((prev) => ({ ...prev, [group.key]: page }))
                        }
                      />
                    </Group>
                  )}
                </Stack>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>

    {/* ── Confirm bulk-remove modal ─────────────────────────────────────── */}
    <Modal
      opened={confirmRemoveGroup !== null}
      onClose={() => setConfirmRemoveGroup(null)}
      title="Remove adjustments"
      size="sm"
    >
      <Text mb="md" size="sm">
        Remove all manual adjustments for the{' '}
        <strong>{confirmRemoveGroup?.entries.length ?? 0} students</strong> in this group?
        Their grades will revert to the originally scored values.
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => setConfirmRemoveGroup(null)}>
          Cancel
        </Button>
        <Button
          color="red"
          onClick={() => {
            if (confirmRemoveGroup) onBulkRemove(confirmRemoveGroup);
            setConfirmRemoveGroup(null);
          }}
        >
          Remove adjustments
        </Button>
      </Group>
    </Modal>
    </>
  );
};

export default AnswerGroupList;
