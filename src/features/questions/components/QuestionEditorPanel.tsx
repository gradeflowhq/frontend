import {
  Accordion,
  Badge,
  Box,
  Button,
  Group,
  Select,
  Skeleton,
  Stack,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import AnswerText from '@components/common/AnswerText';
import { SchemaForm } from '@components/forms/SchemaForm';
import { QUESTION_TYPE_COLORS, QUESTION_TYPES, UNPARSABLE_MARKER, selectRootSchema } from '@features/questions/constants';
import questionsSchema from '@schemas/questions.json';

import type { JsonValue } from './QuestionConfigPreview';
import type {
  ChoiceQuestion,
  MultiValuedQuestion,
  NumericQuestion,
  TextQuestion,
} from '@api/models';
import type { JSONSchema7Definition } from 'json-schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuestionDef = ChoiceQuestion | MultiValuedQuestion | TextQuestion | NumericQuestion;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** The question ID being edited — used only for the heading display. */
  qid: string;
  /** The current persisted definition from the question map. */
  questionDef: QuestionDef;
  /** Whether the parent's update mutation is in-flight. */
  updating: boolean;
  /** Example answer values derived from parsed submissions. */
  examples: unknown[];
  loadingExamples: boolean;
  examplesError?: string;
  /**
   * Called when the user clicks Save.
   * Receives the fully merged question definition ready to be persisted.
   * Must return a Promise — edit mode closes only on success, stays open on error.
   */
  onSave: (updated: QuestionDef) => Promise<void>;
  /**
   * Reports whether the panel has unsaved edits (isEditing / isDirty).
   * Used by the parent to drive the MasterDetailLayout unsaved-changes guard.
   */
  onEditStateChange: (isEditing: boolean) => void;
  /** Optional delete handler — shows a delete button when provided. */
  onDelete?: () => void;
  /** Whether a delete is in-flight. */
  deleting?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Question detail / inline-editor panel for the MasterDetailLayout right side.
 *
 * Defaults to a read-only view; click "Edit" to enter edit mode.
 * The parent should mount a fresh instance per question via `key={selectedQid}`
 * to reset state when the selection changes.
 */
const QuestionEditorPanel: React.FC<Props> = ({
  qid,
  questionDef,
  updating,
  examples,
  loadingExamples,
  examplesError,
  onSave,
  onEditStateChange,
  onDelete,
  deleting,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const colorScheme = useComputedColorScheme('light');
  // Initialise draft from the persisted definition.
  const [draft, setDraft] = useState<Partial<QuestionDef>>({ ...questionDef });

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(questionDef),
    [draft, questionDef],
  );

  // Report editing state to parent whenever it changes.
  useEffect(() => {
    onEditStateChange(isEditing && isDirty);
  }, [isEditing, isDirty, onEditStateChange]);

  const currentType = (draft.type as string) ?? (questionDef.type as string) ?? 'TEXT';
  const viewType = (questionDef.type as string) ?? 'TEXT';
  const rootSchema = selectRootSchema(currentType);

  const cleanExamples = useMemo(
    () => examples.filter((v) => typeof v !== 'string' || !v.includes(UNPARSABLE_MARKER)).slice(0, 10),
    [examples],
  );
  const badExamples = useMemo(
    () => examples.filter((v): v is string => typeof v === 'string' && v.includes(UNPARSABLE_MARKER)).slice(0, 5),
    [examples],
  );

  const handleTypeChange = useCallback(
    (v: string | null) => {
      const newType = (v ?? 'TEXT') as QuestionDef['type'];
      setDraft((prev) => ({ ...(prev ?? {}), type: newType } as Partial<QuestionDef>));
    },
    [],
  );

  const handleFormChange = useCallback(
    ({ formData }: { formData?: QuestionDef }) => {
      setDraft({ ...(formData ?? {}), type: currentType } as Partial<QuestionDef>);
    },
    [currentType],
  );

  const handleSave = useCallback(() => {
    const merged = {
      ...(questionDef as object),
      ...(draft as object),
    } as QuestionDef;
    // Only exit edit mode if the save succeeds.
    onSave(merged).then(() => setIsEditing(false)).catch(() => { /* stay in edit mode */ });
  }, [questionDef, draft, onSave]);

  const handleCancel = useCallback(() => {
    setDraft({ ...questionDef });
    setIsEditing(false);
  }, [questionDef]);

  // ── Examples section (shared between read and edit views) ──────────────────

  const examplesSection = (loadingExamples || cleanExamples.length > 0 || badExamples.length > 0) ? (
    <Accordion variant="separated" defaultValue={'example-answers'}>
      <Accordion.Item value="example-answers">
        <Accordion.Control>Example answers</Accordion.Control>
        <Accordion.Panel>
          {loadingExamples ? (
            <Stack gap="xs">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={28} radius="sm" />
              ))}
            </Stack>
          ) : (
            <Stack gap={6}>
              {cleanExamples.map((ex, i) => (
                <Box
                  key={`clean-${i}`}
                  px="sm"
                  py={6}
                  style={{
                    borderRadius: 'var(--mantine-radius-sm)',
                    border: '1px solid var(--mantine-color-default-border)',
                    backgroundColor: 'var(--mantine-color-default)',
                  }}
                >
                  <Text ff="monospace" size="xs">
                    <AnswerText value={ex} maxLength={80} />
                  </Text>
                </Box>
              ))}
              {badExamples.map((ex, i) => (
                <Box
                  key={`bad-${i}`}
                  px="sm"
                  py={6}
                  style={{
                    borderRadius: 'var(--mantine-radius-sm)',
                    border: '1px solid var(--mantine-color-red-3)',
                    backgroundColor:
                      colorScheme === 'dark' ? 'var(--mantine-color-red-light)' : 'var(--mantine-color-red-0)',
                  }}
                >
                  <Text ff="monospace" size="xs" c="red">
                    <AnswerText value={ex.replace(UNPARSABLE_MARKER, '')} maxLength={80} />
                  </Text>
                </Box>
              ))}
            </Stack>
          )}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ) : examplesError && !loadingExamples ? (
    <Text size="sm" c="dimmed">{examplesError}</Text>
  ) : null;

  // ── Read-only view ─────────────────────────────────────────────────────────

  if (!isEditing) {
    return (
      <Stack gap="md">
        <Group justify="space-between" align="center" mb={4}>
          <Group gap="xs" align="center">
            <Text ff="monospace" fw={700} size="md">
              {qid}
            </Text>
            <Badge variant="light" color={QUESTION_TYPE_COLORS[viewType] ?? 'gray'} size="sm">
              {viewType}
            </Badge>
          </Group>
          <Group gap="xs">
            <Button size="xs" variant="subtle" leftSection={<IconPencil size={14} />} onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            {onDelete && (
              <Button
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={onDelete}
                loading={deleting}
              >
                Delete
              </Button>
            )}
          </Group>
        </Group>

        <QuestionConfigPreview value={questionDef as JsonValue} />

        {examplesSection}
      </Stack>
    );
  }

  // ── Edit view ──────────────────────────────────────────────────────────────

  return (
    <Stack gap="md">
      <Group gap="xs" align="center" mb={4}>
        <Text ff="monospace" fw={700} size="md">
          {qid}
        </Text>
        <Badge variant="light" color={QUESTION_TYPE_COLORS[currentType] ?? 'gray'} size="sm">
          {currentType}
        </Badge>
      </Group>

      <Select
        label="Type"
        data={[...QUESTION_TYPES]}
        value={currentType}
        onChange={handleTypeChange}
      />

      {rootSchema && (
        <Box>
          <SchemaForm<QuestionDef>
            schema={{
              ...(rootSchema as object),
              definitions: questionsSchema as Record<string, JSONSchema7Definition>,
            }}
            uiSchema={{
              'ui:title': '',
              'ui:options': { label: true },
              'ui:submitButtonOptions': { norender: true },
              type: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
            }}
            formData={draft as QuestionDef}
            onChange={handleFormChange}
            onSubmit={() => {}}
            formProps={{ noHtml5Validate: true }}
            showSubmit={false}
          />
        </Box>
      )}

      {examplesSection}

      <Box
        py="md"
        style={{ borderTop: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
      >
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleCancel}>
            Cancel
          </Button>
          <Button loading={updating} onClick={handleSave} disabled={!isDirty}>
            Save
          </Button>
        </Group>
      </Box>
    </Stack>
  );
};

export default QuestionEditorPanel;

// Local import to avoid circular TS errors
// eslint-disable-next-line import/order
import QuestionConfigPreview from './QuestionConfigPreview';
