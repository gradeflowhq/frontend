import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Popover,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCircleCheck, IconInfoCircle, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import {
  useCompatibleRuleKeys,
  useReplaceRubric,
  useRuleDefinitions,
  useValidateAndReplaceRubric,
} from '@features/rules/api';
import { getRuleDescriptionText } from '@features/rules/helpers';
import { findSchemaKeyByType, friendlyRuleLabel } from '@features/rules/schema';
import { getErrorMessage } from '@utils/error';

import InlineRuleEditor from './InlineRuleEditor';
import InlineRulePreview from './InlineRulePreview';
import RuleConfigAccordion from './RuleConfigAccordion';
import RuleDescriptionBlock from './RuleDescriptionBlock';

import type { RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap } from '@api/models';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  qid: string;
  questionType: string;
  rules: RuleValue[];
  allRules: RuleValue[];
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
  ruleKey: string | null;
};

// ── Component ─────────────────────────────────────────────────────────────────

const QuestionDetailPanel: React.FC<Props> = ({
  qid,
  questionType,
  rules,
  allRules,
  coveredByGlobal,
  coveringRule,
  questionMap,
  assessmentId,
  onViewGlobalRule,
  onEditStateChange,
}) => {
  const defs = useRuleDefinitions();
  const singleTargetRuleKeys = useCompatibleRuleKeys(defs, undefined, true);
  const validateAndReplace = useValidateAndReplaceRubric(assessmentId);
  const replace = useReplaceRubric(assessmentId);

  // Each question has at most one rule
  const existingRule = rules[0] ?? null;

  // Inline edit state
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Live draft tracked for preview (updated by InlineRuleEditor)
  const [liveDraft, setLiveDraft] = useState<RuleValue | null>(null);

  // The rule to pass to the preview: draft when editing, saved rule when viewing
  const previewRule = editState ? liveDraft : existingRule;

  // Filter compatible rule keys for this question's type
  const compatibleKeys = useMemo((): string[] => {
    return singleTargetRuleKeys.filter((key) => {
      const props = defs[key]?.properties as Record<string, unknown> | undefined;
      const qt = props?.question_types;
      let allowed: unknown;
      if (qt && typeof qt === 'object' && !Array.isArray(qt)) {
        const defaults = (qt as { default?: unknown }).default;
        const enums = (qt as { enum?: unknown }).enum;
        allowed = Array.isArray(defaults) ? defaults : Array.isArray(enums) ? enums : undefined;
      }
      return !Array.isArray(allowed) || (allowed as unknown[]).includes(questionType);
    });
  }, [defs, singleTargetRuleKeys, questionType]);

  // Label for the covering global rule
  const coveringRuleLabel = coveringRule?.display_name ?? 'a global rule';

  // Question description from question map
  const questionDef = questionMap[qid] as { description?: string | null } | undefined;
  const description = questionDef?.description ?? null;

  const isCovered = rules.length > 0 || coveredByGlobal;
  const isEditing = editState !== null;

  // Rule type badge label — view mode uses existing rule, edit/add mode uses selected key
  const displayRuleType = editState?.ruleKey
    ? friendlyRuleLabel(editState.ruleKey)
    : existingRule?.display_name ?? null;
  const coveringRuleDescription = getRuleDescriptionText(coveringRule);
  const existingRuleDescription = getRuleDescriptionText(existingRule);

  // Notify parent when edit mode changes (used by parent to guard navigation)
  React.useEffect(() => {
    onEditStateChange?.(isEditing);
  }, [isEditing, onEditStateChange]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStartAdd = (ruleKey: string) => {
    setLiveDraft(null);
    setEditState({ mode: 'add', ruleKey });
  };

  const handleStartEdit = () => {
    if (!existingRule) return;
    const ruleType = String((existingRule as { type?: unknown }).type ?? '');
    const key = findSchemaKeyByType(defs, ruleType, true);
    setLiveDraft(existingRule);
    setEditState({ mode: 'edit', ruleKey: key });
  };

  const handleCancelEdit = () => {
    setEditState(null);
    setLiveDraft(null);
  };

  const handleSave = async (rule: RuleValue) => {
    const nextRule = { ...rule, question_id: qid } as RuleValue;
    const existingIdx = existingRule ? allRules.indexOf(existingRule) : -1;
    const nextRules =
      existingIdx >= 0
        ? allRules.map((r, i) => (i === existingIdx ? nextRule : r))
        : [...allRules, nextRule];

    await validateAndReplace.mutateAsync(nextRules, {
      onSuccess: () => {
        setEditState(null);
        setLiveDraft(null);
        notifications.show({ color: 'green', message: 'Rule saved' });
      },
      onError: () => {
        notifications.show({ color: 'red', message: 'Save failed' });
      },
    });
  };

  const handleDelete = async () => {
    if (!existingRule) return;
    const existingIdx = allRules.indexOf(existingRule);
    if (existingIdx < 0) return;
    const nextRules = allRules.filter((_, i) => i !== existingIdx);
    await replace.mutateAsync(nextRules, {
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

          {description && (
            <Popover withinPortal position="bottom-start" withArrow shadow="md">
              <Popover.Target>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  aria-label="Question description"
                >
                  <IconInfoCircle size={14} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown style={{ maxWidth: 320 }}>
                <Text size="sm">{description}</Text>
              </Popover.Dropdown>
            </Popover>
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
                {compatibleKeys.map((key) => (
                  <Menu.Item key={key} onClick={() => handleStartAdd(key)}>
                    {friendlyRuleLabel(key)}
                  </Menu.Item>
                ))}
                {compatibleKeys.length === 0 && (
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
        {coveredByGlobal && coveringRuleDescription && (
          <RuleDescriptionBlock description={coveringRuleDescription} />
        )}

        {!coveredByGlobal && !isEditing && existingRuleDescription && (
          <RuleDescriptionBlock description={existingRuleDescription} />
        )}

        {coveredByGlobal ? (
          <Alert
            variant="light"
            color="blue"
            icon={<IconCircleCheck size={16} />}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Text size="sm">
                Covered by{' '}
                <Text component="span" size="sm" fw={600}>
                  {coveringRuleLabel}
                </Text>
              </Text>
              {onViewGlobalRule && (
                <Button size="xs" variant="subtle" onClick={onViewGlobalRule} px={6}>
                  View →
                </Button>
              )}
            </Group>
          </Alert>
        ) : isEditing ? (
          <InlineRuleEditor
            selectedRuleKey={editState!.ruleKey}
            initialRule={editState!.mode === 'edit' ? existingRule : null}
            questionId={qid}
            questionType={questionType}
            questionMap={questionMap}
            onSave={(rule) => void handleSave(rule)}
            onCancel={handleCancelEdit}
            isSaving={validateAndReplace.isPending}
            error={validateAndReplace.isError ? validateAndReplace.error : null}
            onDraftChange={setLiveDraft}
          />
        ) : existingRule ? (
          <RuleConfigAccordion value={existingRule} contextQuestionId={qid} />
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
            disabled={replace.isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            loading={replace.isPending}
            onClick={() => void handleDelete()}
          >
            Delete
          </Button>
        </Group>
        {replace.isError && (
          <Alert color="red" mt="sm">
            {getErrorMessage(replace.error)}
          </Alert>
        )}
      </Modal>
    </Box>
  );
};

export default QuestionDetailPanel;
