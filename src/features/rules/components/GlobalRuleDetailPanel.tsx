import {
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import { useValidateAndReplaceRubric } from '@features/rules/api';
import { getRuleDescriptionText } from '@features/rules/helpers';
import { useRuleEditorState } from '@features/rules/hooks/useRuleEditorState';
import { getRuleTargetQids } from '@features/rules/schema';

import InlineRulePreview from './InlineRulePreview';
import RuleConfigAccordion from './RuleConfigAccordion';
import RuleDescriptionBlock from './RuleDescriptionBlock';
import RuleEditorForm from './RuleEditorForm';

import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '@features/rules/types';

interface Props {
  /** Index of this rule in allRules. -1 for pending new rules. */
  ruleIndex: number;
  rule: RuleValue;
  allRules: RuleValue[];
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  onEditStateChange?: (isEditing: boolean) => void;
  onDelete: () => void;
  /**
   * When true, the editor opens immediately and Save calls onSavePending
   * instead of the normal replace-in-place logic.
   */
  isPendingNew?: boolean;
  onSavePending?: (rule: RuleValue) => Promise<void>;
  onCancelPending?: () => void;
}

const GlobalRuleDetailPanel: React.FC<Props> = ({
  ruleIndex,
  rule,
  allRules,
  assessmentId,
  questionMap,
  onEditStateChange,
  onDelete,
  isPendingNew = false,
  onSavePending,
  onCancelPending,
}) => {
  const validateAndReplace = useValidateAndReplaceRubric(assessmentId);

  // Pending new rules open straight into edit mode
  const [isEditing, setIsEditing] = useState(isPendingNew);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // Local save error state — needed for isPendingNew where the mutation
  // lives in the parent component (MultiTargetRulesSection) and its error
  // state is not accessible here.
  const [saveError, setSaveError] = useState<unknown>(null);

  const ruleType = String((rule as { type?: unknown }).type ?? '');
  const ruleLabel = rule.display_name;
  const ruleDescription = useMemo(() => getRuleDescriptionText(rule), [rule]);

  const coveredQids = useMemo(() => getRuleTargetQids(rule), [rule]);

  const editorState = useRuleEditorState({
    selectedRuleKey: null,
    initialRule: rule,
    questionId: null,
    questionType: null,
    questionMap,
  });

  React.useEffect(() => {
    onEditStateChange?.(isEditing);
  }, [isEditing, onEditStateChange]);

  const handleStartEdit = () => setIsEditing(true);

  const handleCancelEdit = () => {
    if (isPendingNew) {
      onCancelPending?.();
    } else {
      editorState.setDraft(rule);
      setSaveError(null);
      setIsEditing(false);
    }
  };

  const handleSave = async (next: RuleValue) => {
    setSaveError(null);
    if (isPendingNew) {
      try {
        await onSavePending?.(next);
      } catch (err) {
        setSaveError(err);
      }
      return;
    }
    const nextRules = allRules.map((r, i) => (i === ruleIndex ? next : r));
    try {
      await validateAndReplace.mutateAsync(nextRules, {
        onSuccess: () => {
          setIsEditing(false);
          notifications.show({ color: 'green', message: 'Rule saved' });
        },
      });
    } catch {
      notifications.show({ color: 'red', message: 'Save failed' });
    }
  };

  const displayError = isPendingNew
    ? saveError
    : (validateAndReplace.isError ? validateAndReplace.error : null);

  const previewRule = isEditing ? (editorState.draft ?? rule) : rule;

  return (
    <Box style={{ flex: 1, minWidth: 0 }}>
      {/* ── Header ── */}
      <Group justify="space-between" align="center" mb="md">
        <Group gap="xs" align="center">
          {!isPendingNew && coveredQids.length > 0 && (
            <Badge variant="light" color="gray">
              {coveredQids.length} question{coveredQids.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="light" color="blue">
            {isPendingNew ? 'New Rule' : ruleLabel}
          </Badge>
        </Group>

        {/* Match QuestionDetailPanel: visible labels on header action buttons */}
        {!isEditing && !isPendingNew && (
          <Group gap="xs">
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
          </Group>
        )}
      </Group>

      {/* ── Rule body / editor ── */}
      <Stack gap="xs">
        {!isEditing && ruleDescription && <RuleDescriptionBlock description={ruleDescription} />}

        {isEditing ? (
          <RuleEditorForm
            formKey={`global-rule:${isPendingNew ? 'new' : ruleIndex}:${ruleType}`}
            schemaForRender={editorState.schemaForRender}
            mergedUiSchema={editorState.mergedUiSchema}
            hiddenKeys={editorState.hiddenKeys}
            draft={editorState.draft}
            onDraftChange={(next) => {
              editorState.setDraft(next);
              setSaveError(null);
            }}
            onSave={(next) => void handleSave(next)}
            onCancel={handleCancelEdit}
            isSaving={validateAndReplace.isPending}
            error={displayError}
          />
        ) : (
          <RuleConfigAccordion value={rule} />
        )}

        <InlineRulePreview rule={previewRule} assessmentId={assessmentId} />
      </Stack>

      {/* ── Delete confirmation ── */}
      <Modal
        opened={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Rule"
        size="sm"
      >
        <Text mb="md">Are you sure you want to delete this rule?</Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={() => setDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              setDeleteConfirm(false);
              onDelete();
            }}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </Box>
  );
};

export default GlobalRuleDetailPanel;
