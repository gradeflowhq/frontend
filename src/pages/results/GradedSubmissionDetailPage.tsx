import {
  Accordion, ActionIcon, Alert, Badge, Button, Checkbox, Divider, Group,
  Modal, NumberInput, Paper, Popover, Progress, Select, SimpleGrid, Stack, Table, Text, Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconChevronLeft, IconChevronRight, IconCircleCheck, IconDeviceFloppy, IconFilter, IconPencil, IconTrash } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import AnswerText from '@components/common/AnswerText';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { useGrading, useAdjustGrading } from '@features/grading/hooks';
import { friendlyRuleLabel } from '@features/rules/helpers';
import { isEncrypted } from '@utils/crypto';
import { getErrorMessages } from '@utils/error';
import { natsort } from '@utils/sort';


import type {
  AdjustableSubmission,
  AdjustableQuestionResult,
} from '@api/models';

type ResultWithQid = AdjustableQuestionResult & { question_id: string };
type EditState = Record<string, { points?: number; feedback?: string }>;

const GradedSubmissionDetailInner: React.FC<{ assessmentId: string; encodedStudentId: string }> = ({ assessmentId, encodedStudentId }) => {
  const navigate = useNavigate();

  const safeId = assessmentId;

  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const [encryptedDetected] = useState<boolean>(() => isEncrypted(encodedStudentId));
  React.useEffect(() => {
    if (encryptedDetected) notifyEncryptedDetected();
  }, [encryptedDetected, notifyEncryptedDetected]);

  const { data, isLoading, isError, error } = useGrading(safeId);
  const adjustMutation = useAdjustGrading(safeId);

  const submissions = useMemo<AdjustableSubmission[]>(() => data?.submissions ?? [], [data]);
  const studentIds = useMemo(() => submissions.map((s) => s.student_id).sort(natsort), [submissions]);
  const { decryptedIds, isDecrypting: isDecryptingIds } = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  const index = submissions.findIndex((s) => s.student_id === encodedStudentId);
  const current = index >= 0 ? submissions[index] : null;
  const prevId = index > 0 ? submissions[index - 1].student_id : null;
  const nextId = index >= 0 && index < submissions.length - 1 ? submissions[index + 1].student_id : null;

  const sortedResults = useMemo(() => {
    if (!current?.result_map) return [] as ResultWithQid[];
    return Object.entries(current.result_map)
      .map(([qid, r]) => ({ ...r, question_id: qid }))
      .sort((a, b) => natsort(a.question_id, b.question_id));
  }, [current]);

  const [editing, setEditing] = useState<EditState>({});
  const [openEdits, setOpenEdits] = useState<Record<string, boolean>>({});
  const [removeAdjustQid, setRemoveAdjustQid] = useState<string | null>(null);


  const [filterOpen, setFilterOpen] = useState(false);

  const allQids = useMemo(() => sortedResults.map((r) => r.question_id), [sortedResults]);
  const [selectedQids, setSelectedQids] = useState<Set<string> | null>(null);
  const visibleResults = useMemo(
    () => (selectedQids === null ? sortedResults : sortedResults.filter((r) => selectedQids.has(r.question_id))),
    [sortedResults, selectedQids],
  );

  const toggleQid = (qid: string) => {
    setSelectedQids((prev) => {
      const base = prev ?? new Set(allQids);
      const next = new Set(base);
      if (next.has(qid)) {
        next.delete(qid);
      } else {
        next.add(qid);
      }
      return next.size === allQids.length ? null : next;
    });
  };

  const activeFilterCount = selectedQids === null ? 0 : allQids.length - selectedQids.size;

  const startEdit = (qid: string, res: AdjustableQuestionResult) => {
    setOpenEdits((prev) => ({ ...prev, [qid]: true }));
    setEditing((prev) => ({
      ...prev,
      [qid]: {
        points: res.adjusted_points ?? res.points ?? undefined,
        feedback: res.adjusted_feedback ?? res.feedback ?? undefined,
      },
    }));
  };

  const cancelEdit = (qid: string) => {
    setOpenEdits((prev) => ({ ...prev, [qid]: false }));
    setEditing((prev) => {
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  };



  const saveEdit = async (qid: string) => {
    if (!current) return;
    const e = editing[qid];
    if (!e) return;
    try {
      await adjustMutation.mutateAsync({
        student_id: current.student_id,
        question_id: qid,
        adjusted_points: e.points ?? null,
        adjusted_feedback: e.feedback ?? null,
      });
      cancelEdit(qid);
      notifications.show({ color: 'green', message: 'Adjustment saved' });
    } catch {
      notifications.show({ color: 'red', message: 'Save failed' });
    }
  };

  const gotoPrev = () => {
    if (prevId) void navigate(`/results/${safeId}/${encodeURIComponent(prevId)}`);
  };
  const gotoNext = () => {
    if (nextId) void navigate(`/results/${safeId}/${encodeURIComponent(nextId)}`);
  };

  React.useEffect(() => {
    setEditing({});
    setOpenEdits({});
  }, [encodedStudentId]);

  if (isLoading) return <Alert color="blue">Loading submission...</Alert>;
  if (isError) return <Alert color="red">{getErrorMessages(error).join(' ')}</Alert>;
  if (!current) return <Alert color="yellow">Submission not found.</Alert>;

  const originalTotalPoints = sortedResults.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const adjustedTotalPoints = sortedResults.reduce(
    (sum, r) =>
      sum + (r.adjusted_points !== null && r.adjusted_points !== undefined ? r.adjusted_points : (r.points ?? 0)),
    0
  );
  const totalMax = sortedResults.reduce((sum, r) => sum + (r.max_points ?? 0), 0);
  const adjustmentsCount = sortedResults.filter(
    (r) =>
      (r.adjusted_points !== null && r.adjusted_points !== undefined) ||
      (r.adjusted_feedback !== null && r.adjusted_feedback !== undefined)
  ).length;

  const originalPct = totalMax > 0 ? (originalTotalPoints / totalMax) * 100 : 0;
  const adjustedPct = totalMax > 0 ? (adjustedTotalPoints / totalMax) * 100 : 0;
  const delta = adjustedTotalPoints - originalTotalPoints;

  return (
    <Stack gap="md">
      <Group align="center" justify="space-between">
        <Group gap="sm" align="center">
          <Button variant="outline" size="sm" onClick={() => void navigate(`/results/${safeId}`)} leftSection={<IconChevronLeft size={16} />}>
            Back
          </Button>
          <Select
            searchable
            size="sm"
            w={240}
            placeholder="Select student"
            value={encodedStudentId}
            onChange={(v) => v && void navigate(`/results/${safeId}/${encodeURIComponent(v)}`)}
            data={studentIds.map((id) => ({
              value: id,
              label: decryptedIds[id] ?? id,
            }))}
          />
          {isDecryptingIds && (
            <Badge variant="light" color="gray" size="sm">Decrypting IDs...</Badge>
          )}
        </Group>
        <Group gap="xs">
          <ActionIcon variant="outline" onClick={gotoPrev} disabled={!prevId} aria-label="Previous">
            <IconChevronLeft size={16} />
          </ActionIcon>
          <ActionIcon variant="outline" onClick={gotoNext} disabled={!nextId} aria-label="Next">
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
      </Group>

      {adjustMutation.isError && (
        <Alert color="red">{getErrorMessages(adjustMutation.error).join(' ')}</Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md">
          <Text size="xs" c="dimmed" mb={4}>Total (Original)</Text>
          <Group gap="xs" align="baseline">
            <Text ff="monospace" fw={700} size="xl">{originalTotalPoints}</Text>
            <Text c="dimmed" size="sm">/ {totalMax}</Text>
          </Group>
          <Group gap="xs" mt={6} align="center">
            <Progress value={originalPct} w={120} size="sm" />
            <Text ff="monospace" size="xs">{originalPct.toFixed(1)}%</Text>
          </Group>
        </Paper>

        <Paper withBorder p="md">
          <Text size="xs" c="dimmed" mb={4}>Total (Adjusted)</Text>
          <Group gap="xs" align="baseline">
            <Text ff="monospace" fw={700} size="xl">{adjustedTotalPoints}</Text>
            <Text c="dimmed" size="sm">/ {totalMax}</Text>
          </Group>
          <Group gap="xs" mt={6} align="center">
            <Progress value={adjustedPct} w={120} size="sm" color="teal" />
            <Text ff="monospace" size="xs">{adjustedPct.toFixed(1)}%</Text>
            <Text ff="monospace" size="xs" c={delta >= 0 ? 'green' : 'red'}>
              {`Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
            </Text>
          </Group>
        </Paper>

        <Paper withBorder p="md">
          <Text size="xs" c="dimmed" mb={4}>Adjustments</Text>
          <Text fw={700} size="xl">{adjustmentsCount}</Text>
        </Paper>
      </SimpleGrid>

      <Group justify="space-between" align="center" px={4}>
        <Text size="sm" fw={500}>
          Showing {visibleResults.length} / {allQids.length} questions
          {activeFilterCount > 0 && (
            <Badge variant="light" color="yellow" size="sm" ml={8}>{activeFilterCount} hidden</Badge>
          )}
        </Text>
        <Popover opened={filterOpen} onClose={() => setFilterOpen(false)} position="bottom-end" withArrow>
          <Popover.Target>
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconFilter size={14} />}
              onClick={() => setFilterOpen((v) => !v)}
            >
              Filter Questions
              {activeFilterCount > 0 && (
                <Badge variant="filled" color="yellow" size="xs" ml={4}>{activeFilterCount}</Badge>
              )}
            </Button>
          </Popover.Target>
          <Popover.Dropdown p="xs" w={224}>
            <Stack gap={4}>
              <Group gap={4}>
                <Button size="xs" variant="subtle" flex={1} onClick={() => setSelectedQids(null)}>Show all</Button>
                <Button size="xs" variant="subtle" flex={1} onClick={() => setSelectedQids(new Set())}>Hide all</Button>
              </Group>
              <Divider />
              {allQids.map((qid) => (
                <Checkbox
                  key={qid}
                  size="xs"
                  checked={selectedQids === null || selectedQids.has(qid)}
                  onChange={() => toggleQid(qid)}
                  label={<Text ff="monospace" size="xs">{qid}</Text>}
                />
              ))}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>

      <Table.ScrollContainer minWidth={700}>
        <Table withTableBorder withColumnBorders verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Question ID</Table.Th>
              <Table.Th>Rule</Table.Th>
              <Table.Th title="Passed"><IconCircleCheck size={14} /></Table.Th>
              <Table.Th>Answer</Table.Th>
              <Table.Th>Points</Table.Th>
              <Table.Th>Feedback</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleResults.map((res) => {
              const qid = res.question_id;
              const isEditing = !!openEdits[qid];
              const local = editing[qid];

              const adjustedExists =
                (res.adjusted_points !== undefined && res.adjusted_points !== null) ||
                (res.adjusted_feedback !== undefined && res.adjusted_feedback !== null);

              return (
                <Table.Tr
                  key={qid}
                  style={{
                    background: adjustedExists ? 'var(--mantine-color-yellow-0)' : undefined,
                    verticalAlign: 'top',
                  }}
                >
                  <Table.Td>
                    <Text ff="monospace" size="sm">{qid}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge variant="light" color="gray" ff="monospace" size="sm">
                      {friendlyRuleLabel(res.rule)}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    {!res.graded ? (
                      <Badge color="yellow" size="sm">Ungraded</Badge>
                    ) : res.passed ? (
                      <IconCircleCheck size={16} color="var(--mantine-color-green-6)" aria-label="Passed" />
                    ) : (
                      <IconAlertCircle size={16} color="var(--mantine-color-red-6)" aria-label="Failed" />
                    )}
                  </Table.Td>

                  <Table.Td>
                    <AnswerText value={current.answer_map?.[qid]} maxLength={100} />
                  </Table.Td>

                  <Table.Td>
                    {!isEditing ? (
                      <Stack gap={2}>
                        <Group gap="xs" align="baseline">
                          <Text ff="monospace" size="sm">{res.adjusted_points ?? res.points}</Text>
                          <Text c="dimmed" size="xs">/ {res.max_points}</Text>
                        </Group>
                        {adjustedExists && res.adjusted_points !== null && res.adjusted_points !== undefined && (
                          <Badge variant="light" color="gray" size="xs" ff="monospace">
                            Original: {res.points} / {res.max_points}
                          </Badge>
                        )}
                      </Stack>
                    ) : (
                      <Group align="center" gap="xs">
                        <NumberInput
                          size="xs"
                          w={96}
                          value={local?.points ?? ''}
                          onChange={(v) =>
                            setEditing((prev) => ({
                              ...prev,
                              [qid]: {
                                ...prev[qid],
                                points: v === '' ? undefined : Number(v),
                              },
                            }))
                          }
                          placeholder="Points"
                          min={0}
                          max={res.max_points ?? undefined}
                        />
                        <Text c="dimmed" size="xs">/ {res.max_points}</Text>
                      </Group>
                    )}
                  </Table.Td>

                  <Table.Td>
                    {!isEditing ? (
                      <Stack gap={4}>
                        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                          {(res.adjusted_feedback ?? res.feedback) || <Text component="span" c="dimmed">—</Text>}
                        </Text>
                        {adjustedExists && res.adjusted_feedback !== null && res.adjusted_feedback !== undefined && (
                          <Accordion variant="contained" mt={4}>
                            <Accordion.Item value="original">
                              <Accordion.Control>
                                <Text size="xs">Original</Text>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Text size="xs" style={{ whiteSpace: 'pre-line' }}>
                                  {res.feedback || <Text component="span" c="dimmed">—</Text>}
                                </Text>
                              </Accordion.Panel>
                            </Accordion.Item>
                          </Accordion>
                        )}
                      </Stack>
                    ) : (
                      <Textarea
                        size="xs"
                        value={local?.feedback ?? ''}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [qid]: {
                              ...prev[qid],
                              feedback: e.target.value === '' ? undefined : e.target.value,
                            },
                          }))
                        }
                        placeholder="Feedback"
                        autosize
                        minRows={2}
                      />
                    )}
                  </Table.Td>

                  <Table.Td>
                    {!isEditing ? (
                      <Group gap="xs">
                        <Button size="xs" leftSection={<IconPencil size={12} />} onClick={() => startEdit(qid, res)}>
                          Edit
                        </Button>
                        {adjustedExists && (
                          <Button
                            size="xs"
                            color="red"
                            variant="outline"
                            leftSection={<IconTrash size={12} />}
                            onClick={() => setRemoveAdjustQid(qid)}
                            title="Remove Adjustment"
                          >
                            Remove
                          </Button>
                        )}
                      </Group>
                    ) : (
                      <Group gap="xs">
                        <Button
                          size="xs"
                          leftSection={<IconDeviceFloppy size={12} />}
                          loading={adjustMutation.isPending}
                          onClick={() => void saveEdit(qid)}
                        >
                          Save
                        </Button>
                        <Button size="xs" variant="default" onClick={() => cancelEdit(qid)}>
                          Cancel
                        </Button>
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal
        opened={!!removeAdjustQid}
        onClose={() => setRemoveAdjustQid(null)}
        title="Remove Adjustment"
      >
        <Text mb="md">This will revert the adjusted points and feedback for this question. Proceed?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setRemoveAdjustQid(null)}>Cancel</Button>
          <Button
            color="red"
            loading={adjustMutation.isPending}
            onClick={() => {
              if (!current || !removeAdjustQid) return;
              adjustMutation.mutate(
                {
                  student_id: current.student_id,
                  question_id: removeAdjustQid,
                  adjusted_points: null,
                  adjusted_feedback: null,
                },
                {
                  onSuccess: () => {
                    setRemoveAdjustQid(null);
                    notifications.show({ color: 'green', message: 'Adjustment removed' });
                  },
                  onError: () => notifications.show({ color: 'red', message: 'Remove failed' }),
                },
              );
            }}
          >
            Remove
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
};

const GradedSubmissionDetailPage: React.FC = () => {
  const { assessmentId, studentId } = useParams<{ assessmentId: string; studentId: string }>();
  if (!assessmentId || !studentId) {
    return <Alert color="red">Assessment ID or Student ID is missing.</Alert>;
  }
  return (
    <AssessmentPassphraseProvider assessmentId={assessmentId}>
      <GradedSubmissionDetailInner assessmentId={assessmentId} encodedStudentId={studentId} />
    </AssessmentPassphraseProvider>
  );
};

export default GradedSubmissionDetailPage;
