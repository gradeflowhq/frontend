import {
  Alert, Button, Center, Group, Pagination, Select, Skeleton, Stack, Table, Text,
} from '@mantine/core';
import { IconDeviceFloppy, IconPencil, IconQuestionMark } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import AnswerText from '@components/common/AnswerText';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import { getQuestionIdsSorted } from '@features/questions/helpers';
import questionsSchema from '@schemas/questions.json';
import { getErrorMessages } from '@utils/error';

import type { JsonValue } from './QuestionsConfigRender';
import type {
  QuestionSetInput,
  QuestionSetOutputQuestionMap,
  ChoiceQuestion,
  MultiValuedQuestion,
  TextQuestion,
  NumericQuestion,
} from '@api/models';
import type { JSONSchema7Definition } from 'json-schema';




const UNPARSABLE_MARKER = '__UNPARSABLE__:';
type QuestionDef = ChoiceQuestion | MultiValuedQuestion | TextQuestion | NumericQuestion;
type QuestionDraft = Partial<QuestionDef>;
type ExamplesByQuestion = Record<string, unknown[]>;

type Props = {
  questionMap: QuestionSetOutputQuestionMap;
  examplesByQuestion: ExamplesByQuestion;
  onUpdateQuestionSet: (next: QuestionSetInput) => Promise<void> | void;
  updating?: boolean;
  updateError?: unknown;
  initialPageSize?: number;
  searchQuery?: string;
  loadingQuestions?: boolean;
  loadingExamples?: boolean;
  examplesError?: string;
};

const QuestionsTable: React.FC<Props> = ({
  questionMap,
  examplesByQuestion,
  onUpdateQuestionSet,
  updating,
  updateError,
  initialPageSize = 10,
  searchQuery,
  loadingQuestions = false,
  loadingExamples = false,
  examplesError,
}) => {
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});
  const [openEdits, setOpenEdits] = useState<Record<string, boolean>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const ids = useMemo(() => getQuestionIdsSorted(questionMap), [questionMap]);

  const filteredIds = useMemo(() => {
    const q = (searchQuery ?? '').trim().toLowerCase();
    if (!q) return ids;
    return ids.filter((qid) => {
      const def = drafts[qid] ?? (questionMap[qid] as QuestionDef | undefined);
      const type = (def?.type as string) ?? '';
      if (qid.toLowerCase().includes(q)) return true;
      if (type.toLowerCase().includes(q)) return true;
      const configText = JSON.stringify(def ?? {}).toLowerCase();
      if (configText.includes(q)) return true;
      const examples = examplesByQuestion[qid] ?? [];
      return examples.some((ex) => String(ex ?? '').toLowerCase().includes(q));
    });
  }, [ids, questionMap, drafts, examplesByQuestion, searchQuery]);

  const pagedIds = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredIds.slice(start, start + pageSize);
  }, [filteredIds, pageIndex, pageSize]);

  const selectRootSchema = (type: string | undefined) => {
    const dict = questionsSchema as Record<string, unknown>;
    switch (type) {
      case 'CHOICE': return (dict as Record<string, unknown>).ChoiceQuestion ?? null;
      case 'MULTI_VALUED': return (dict as Record<string, unknown>).MultiValuedQuestion ?? null;
      case 'NUMERIC': return (dict as Record<string, unknown>).NumericQuestion ?? null;
      case 'TEXT':
      default: return (dict as Record<string, unknown>).TextQuestion ?? null;
    }
  };

  const buildQuestionSetInput = (): QuestionSetInput => {
    const resolvedDrafts = Object.fromEntries(
      Object.entries(drafts).map(([qid, draft]) => [
        qid,
        { ...(questionMap[qid] as QuestionDef), ...(draft as QuestionDef) } as QuestionDef,
      ])
    );
    return { question_map: { ...questionMap, ...resolvedDrafts } as QuestionSetInput['question_map'] };
  };

  if (!ids.length && !loadingQuestions) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <IconQuestionMark size={32} opacity={0.4} />
          <Text c="dimmed">No questions</Text>
          <Text size="sm" c="dimmed">Upload or import a question set, or infer from submissions.</Text>
        </Stack>
      </Center>
    );
  }

  if (filteredIds.length === 0 && !loadingQuestions) {
    return <Text c="dimmed">No questions match your search.</Text>;
  }

  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, filteredIds.length);

  return (
    <Stack gap="xs">
      {!!updateError && (
        <Alert color="red">{getErrorMessages(updateError).join(' ')}</Alert>
      )}
      <Table.ScrollContainer minWidth={680}>
        <Table withTableBorder withColumnBorders verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Question ID</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Configuration</Table.Th>
              <Table.Th>Example answers</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loadingQuestions
              ? Array.from({ length: pageSize }).map((_, i) => (
                  <Table.Tr key={i}>
                    <Table.Td colSpan={5}>
                      <Skeleton height={32} />
                    </Table.Td>
                  </Table.Tr>
                ))
              : pagedIds.map((qid) => {
                  const baseDef = questionMap[qid] as QuestionDef | undefined;
                  const def = drafts[qid]
                    ? ({ ...(baseDef ?? {}), ...(drafts[qid] as QuestionDef) } as QuestionDef)
                    : baseDef;
                  const type = (def?.type as string) ?? 'TEXT';
                  const rootSchema = selectRootSchema(type);
                  const examples = examplesByQuestion[qid] ?? [];
                  const isEditing = !!openEdits[qid];

                  return (
                    <Table.Tr key={qid} style={{ verticalAlign: 'top' }}>
                      <Table.Td>
                        <Text ff="monospace" size="sm">{qid}</Text>
                      </Table.Td>

                      <Table.Td>
                        {!isEditing ? (
                          <Text size="sm">{type}</Text>
                        ) : (
                          <Select
                            size="sm"
                            data={['TEXT', 'NUMERIC', 'CHOICE', 'MULTI_VALUED']}
                            value={type}
                            onChange={(v) => {
                              const nextType = (v ?? 'TEXT') as QuestionDef['type'];
                              setDrafts((prev) => ({
                                ...prev,
                                [qid]: { ...(questionMap[qid] as QuestionDef), ...(prev[qid] ?? {}), type: nextType },
                              }));
                            }}
                            w={160}
                          />
                        )}
                      </Table.Td>

                      <Table.Td>
                        {!isEditing ? (
                          <QuestionsConfigRender value={(def ?? baseDef ?? {}) as JsonValue} />
                        ) : rootSchema ? (
                          <div style={{ maxWidth: 480 }}>
                            <SchemaForm<QuestionDef>
                              schema={{ ...rootSchema, definitions: questionsSchema as Record<string, JSONSchema7Definition> }}
                              uiSchema={{
                                'ui:title': '',
                                'ui:options': { label: true },
                                'ui:submitButtonOptions': { norender: true },
                                type: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
                              }}
                              formData={def ?? baseDef}
                              onChange={({ formData }) => {
                                const next = { ...(formData || {}), type } as QuestionDef;
                                setDrafts((prev) => ({ ...prev, [qid]: next }));
                              }}
                              onSubmit={() => {}}
                              formProps={{ noHtml5Validate: true }}
                              showSubmit={false}
                            />
                          </div>
                        ) : (
                          <Text c="dimmed" size="sm">No config</Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        {loadingExamples ? (
                          <Stack gap="xs">
                            {[0, 1, 2].map((i) => <Skeleton key={i} height={16} w={128} />)}
                          </Stack>
                        ) : examples.length ? (
                          <ul style={{ listStyle: 'disc', paddingLeft: 16, margin: 0 }}>
                            {examples
                              .filter((v) => !(typeof v === 'string' && v.includes(UNPARSABLE_MARKER)))
                              .slice(0, 5)
                              .map((ex, i) => (
                                <li key={`clean-${i}`} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  <AnswerText value={String(ex ?? '')} maxLength={50} />
                                </li>
                              ))}
                            {examples
                              .filter((v) => typeof v === 'string' && v.includes(UNPARSABLE_MARKER))
                              .slice(0, 5)
                              .map((ex, i) => (
                                <li key={`raw-${i}`} style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'red' }}>
                                  <AnswerText value={String(ex ?? '').replace(UNPARSABLE_MARKER, '')} maxLength={50} />
                                </li>
                              ))}
                          </ul>
                        ) : examplesError ? (
                          <Text size="sm" c="dimmed">{examplesError}</Text>
                        ) : (
                          <Text size="sm" c="dimmed">—</Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        {!isEditing ? (
                          <Button
                            size="sm"
                            leftSection={<IconPencil size={14} />}
                            onClick={() => {
                              setOpenEdits((prev) => ({ ...prev, [qid]: true }));
                              setDrafts((prev) => ({ ...prev, [qid]: (questionMap[qid] as QuestionDef) }));
                            }}
                          >
                            Edit
                          </Button>
                        ) : (
                          <Group gap="xs">
                            <Button
                              size="sm"
                              leftSection={<IconDeviceFloppy size={14} />}
                              loading={updating}
                              onClick={() => {
                                const nextQS = buildQuestionSetInput();
                                void Promise.resolve(onUpdateQuestionSet(nextQS)).then(() => {
                                  setOpenEdits((prev) => ({ ...prev, [qid]: false }));
                                  setDrafts((prev) => {
                                    const { [qid]: _removed, ...rest } = prev;
                                    return rest;
                                  });
                                });
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="subtle"
                              onClick={() => {
                                setDrafts((prev) => {
                                  const { [qid]: _removed, ...rest } = prev;
                                  return rest;
                                });
                                setOpenEdits((prev) => ({ ...prev, [qid]: false }));
                              }}
                            >
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

      <Group justify="space-between" px="md" py="sm">
        <Text size="sm" c="dimmed">Showing {from}–{to} of {filteredIds.length}</Text>
        <Group gap="sm">
          <Select
            size="xs"
            data={['5', '10', '20', '50', '100']}
            value={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v ?? '10')); setPageIndex(0); }}
            w={96}
          />
          <Pagination
            value={pageIndex + 1}
            onChange={(p) => setPageIndex(p - 1)}
            total={Math.ceil(filteredIds.length / pageSize)}
            size="sm"
          />
        </Group>
      </Group>
    </Stack>
  );
};

// Local import to avoid circular TS errors
// eslint-disable-next-line import/order
import QuestionsConfigRender from './QuestionsConfigRender';
export default QuestionsTable;
