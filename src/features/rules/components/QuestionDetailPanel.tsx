import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCircleCheck, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import React, { useState } from 'react';

import {
  useCompatibleRules,
  useCreateRule,
  useDeleteRule,
  useUpdateRule,
} from '@features/rules/api';
import { getRuleDescriptionText } from '@features/rules/helpers';
import { getErrorMessage } from '@utils/error';

import InlineRulePreview from './InlineRulePreview';
import RuleConfigAccordion from './RuleConfigAccordion';
import RuleDescriptionBlock from './RuleDescriptionBlock';
import RuleEditor from './RuleEditor';

import type { RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap } from '@api/models';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  qid: string;
  questionType: string;
  rules: RuleValue[];
  coveredByGlobal: boolean;
  coveringRule?: RuleValue;
  questionMap: QuestionSetOutputQuestionMap;
  assessmentId: string;
  onViewGlobalRule?: () => void;
  /** Called when the inline edit mode is entered or exited. */
  onEditStateChange?: (isEditing: boolean) => void;
}

type EditState = {
  mode: 'add' | 'edit';
  ruleType: string | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

const QuestionDetailPanel: React.FC<Props> = ({
  qid,
  questionType,
  rules,
  coveredByGlobal,
  coveringRule,
  questionMap,
  assessmentId,
  onViewGlobalRule,
  onEditStateChange,
}) => {
  const compatibleRules = useCompatibleRules(assessmentId, { question_id: qid });
  const createRule = useCreateRule(assessmentId);
  const updateRule = useUpdateRule(assessmentId);
  const deleteRule = useDeleteRule(assessmentId);

  // Each question has at most one rule
  const existingRule = rules[0] ?? null;

  // Inline edit state
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Live draft tracked for preview when a new rule editor first mounts.
  const [liveDraft, setLiveDraft] = useState<RuleValue | null>(null);

  // The rule to pass to the preview: draft when editing, saved rule when viewing
  const previewRule = editState ? liveDraft : existingRule;

  // Label for the covering global rule
  const coveringRuleLabel = coveringRule?.display_name;

  // Question description from question map
  const questionDef = questionMap[qid] as { description?: string | null } | undefined;
  const description = questionDef?.description ?? null;

  const isCovered = rules.length > 0 || coveredByGlobal;
  const isEditing = editState !== null;

  // Rule type badge label — view mode uses existing rule, edit/add mode uses selected type
  const displayRuleType = editState?.ruleType
    ? compatibleRules.data?.find((rule) => rule.type === editState.ruleType)?.label
    : existingRule?.display_name ?? null;
  const coveringRuleDescription = getRuleDescriptionText(coveringRule);
  const existingRuleDescription = getRuleDescriptionText(existingRule);

  // Notify parent when edit mode changes (used by parent to guard navigation)
  React.useEffect(() => {
    onEditStateChange?.(isEditing);
  }, [isEditing, onEditStateChange]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStartAdd = (ruleType: string) => {
    setLiveDraft(null);
    setEditState({ mode: 'add', ruleType });
  };

  const handleStartEdit = () => {
    if (!existingRule) return;
    setLiveDraft(existingRule);
    setEditState({ mode: 'edit', ruleType: existingRule.type });
  };

  const handleCancelEdit = () => {
    setEditState(null);
    setLiveDraft(null);
  };

  const handleSave = async (rule: RuleValue) => {
    try {
      if (existingRule) {
        await updateRule.mutateAsync({ ruleId: existingRule.id!, rule });
      } else {
        await createRule.mutateAsync(rule);
      }
      setEditState(null);
      setLiveDraft(null);
      notifications.show({ color: 'green', message: 'Rule saved' });
    } catch {
      notifications.show({ color: 'red', message: 'Save failed' });
    }
  };

  const handleDelete = async () => {
    if (!existingRule) return;
    await deleteRule.mutateAsync(existingRule.id!, {
      onSuccess: () => {
        setDeleteConfirm(false);
        notifications.show({ color: 'green', message: 'Rule deleted' });
      },
      onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
    });
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const canAddRule = !coveredByGlobal && !existingRule && !isEditing;
  const canEditRule = !coveredByGlobal && !!existingRule && !isEditing;
  const showPreview = (existingRule !== null || (isEditing && previewRule !== null)) && !!assessmentId;
  const isSaving = createRule.isPending || updateRule.isPending;
  const saveError = createRule.error ?? updateRule.error;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box style={{ flex: 1, minWidth: 0 }}>
      {/* ── Header ── */}
      <Group justify="space-between" align="center" mb="md">
        <Group gap="xs" align="center">
          <Text ff="monospace" fw={700} size="md">
            {qid}
          </Text>
          <Badge variant="light" color="gray">
            {questionType}
          </Badge>

          {displayRuleType && (
            <Badge variant="light" color="blue">
              {displayRuleType}
            </Badge>
          )}

          {isCovered && (
            <IconCircleCheck size={24} color="var(--mantine-color-green-6)" />
          )}
        </Group>

        <Group gap="xs">
          {canAddRule && (
            <Menu position="bottom-end">
              <Menu.Target>
                <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />}>
                  Add
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {(compatibleRules.data ?? []).map((rule) => (
                  <Menu.Item key={rule.type} onClick={() => handleStartAdd(rule.type)}>
                    {rule.label}
                  </Menu.Item>
                ))}
                {(compatibleRules.data?.length ?? 0) === 0 && (
                  <Menu.Item disabled>No compatible rules</Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}

          {canEditRule && (
            <>
              <Button size="xs" variant="subtle" leftSection={<IconPencil size={14} />} onClick={handleStartEdit}>
                Edit
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => setDeleteConfirm(true)}
              >
                Delete
              </Button>
            </>
          )}
        </Group>
      </Group>

      {/* ── Rule section ── */}
      <Stack gap="xs">
        {description && (
          <Stack gap={2} mb="xs">
            <Text c="dimmed" size="sm" fw={500}>Question</Text>
            <Text component="div" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {description}
            </Text>
          </Stack>
        )}

        {!isEditing && (coveredByGlobal ? coveringRuleDescription : existingRuleDescription) && (
          <RuleDescriptionBlock
            description={(coveredByGlobal ? coveringRuleDescription : existingRuleDescription)!}
          />
        )}

        {coveredByGlobal ? (
          <Alert
            variant="light"
            color="blue"
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              {coveringRuleLabel ? (
                <Text size="sm">
                  Global rule:{' '}
                  <Text component="span" size="sm" fw={600}>
                    {coveringRuleLabel}
                  </Text>
                </Text>
              ) : (
                <Text size="sm">Global rule</Text>
              )}
              {onViewGlobalRule && (
                <Button size="xs" variant="subtle" onClick={onViewGlobalRule} px={6}>
                  View →
                </Button>
              )}
            </Group>
          </Alert>
        ) : isEditing ? (
          <RuleEditor
            formKeyBase={`rule:${qid}`}
            selectedRuleType={editState!.ruleType}
            assessmentId={assessmentId}
            initialRule={editState!.mode === 'edit' ? existingRule : null}
            questionId={qid}
            onSave={(rule) => void handleSave(rule)}
            onCancel={handleCancelEdit}
            isSaving={isSaving}
            error={saveError}
            onDraftChange={setLiveDraft}
          />
        ) : existingRule ? (
          <RuleConfigAccordion
            assessmentId={assessmentId}
            value={existingRule}
            contextQuestionId={qid}
          />
        ) : (
          <Text size="sm" c="dimmed">
            No rule for this question yet.
          </Text>
        )}

        {/* ── Grading preview — always shown when rule exists or is being created ── */}
        {showPreview && previewRule !== null && (
          <InlineRulePreview
            rule={previewRule}
            assessmentId={assessmentId}
          />
        )}
      </Stack>

      {/* ── Delete confirmation modal ── */}
      <Modal
        opened={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Rule"
        size="sm"
      >
        <Text mb="md">Are you sure you want to delete this rule?</Text>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            onClick={() => setDeleteConfirm(false)}
            disabled={deleteRule.isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            loading={deleteRule.isPending}
            onClick={() => void handleDelete()}
          >
            Delete
          </Button>
        </Group>
        {deleteRule.isError && (
          <Alert color="red" mt="sm">
            {getErrorMessage(deleteRule.error)}
          </Alert>
        )}
      </Modal>
    </Box>
  );
};

export default QuestionDetailPanel;
