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

import { useUpdateRule } from '@features/rules/api';
import { getRuleDescriptionText } from '@features/rules/helpers';

import InlineRulePreview from './InlineRulePreview';
import RuleConfigAccordion from './RuleConfigAccordion';
import RuleDescriptionBlock from './RuleDescriptionBlock';
import RuleEditor from './RuleEditor';

import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '@features/rules/types';

interface Props {
  rule: RuleValue;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  onEditStateChange?: (isEditing: boolean) => void;
  onDelete: () => void;
  coveredQids: string[];
  isSaving?: boolean;
  /**
   * When true, the editor opens immediately and Save calls onSavePending
   * instead of the normal replace-in-place logic.
   */
  isPendingNew?: boolean;
  onSavePending?: (rule: RuleValue) => Promise<void>;
  onCancelPending?: () => void;
}

const GlobalRuleDetailPanel: React.FC<Props> = ({
  rule,
  assessmentId,
  questionMap,
  onEditStateChange,
  onDelete,
  coveredQids,
  isSaving = false,
  isPendingNew = false,
  onSavePending,
  onCancelPending,
}) => {
  const updateRule = useUpdateRule(assessmentId);

  // Pending new rules open straight into edit mode
  const [isEditing, setIsEditing] = useState(isPendingNew);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  // Local save error state — needed for isPendingNew where the mutation
  // lives in the parent component (MultiTargetRulesSection) and its error
  // state is not accessible here.
  const [saveError, setSaveError] = useState<unknown>(null);
  const draftReaderRef = React.useRef<(() => RuleValue | null) | null>(null);

  const ruleType = rule.type;
  const ruleLabel = rule.display_name;
  const ruleDescription = useMemo(() => getRuleDescriptionText(rule), [rule]);

  React.useEffect(() => {
    onEditStateChange?.(isEditing);
  }, [isEditing, onEditStateChange]);

  const handleStartEdit = () => {
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (isPendingNew) {
      onCancelPending?.();
    } else {
      draftReaderRef.current = null;
      setSaveError(null);
      setIsEditing(false);
    }
  };

  const handleDraftEdit = React.useCallback(() => {
    setSaveError(null);
  }, []);

  const handleDraftReaderChange = React.useCallback((reader: (() => RuleValue | null) | null) => {
    draftReaderRef.current = reader;
  }, []);

  const handleSave = async (next: RuleValue) => {
    setSaveError(null);
    if (isPendingNew) {
      setPendingSave(true);
      try {
        await onSavePending?.(next);
      } catch (err) {
        setSaveError(err);
      } finally {
        setPendingSave(false);
      }
      return;
    }
    try {
      await updateRule.mutateAsync({ ruleId: rule.id, rule: next });
      setIsEditing(false);
      notifications.show({ color: 'green', message: 'Rule saved' });
    } catch (err) {
      setSaveError(err);
      notifications.show({ color: 'red', message: 'Save failed' });
    }
  };

  const displayError = saveError ?? updateRule.error;
  const editorSaving = isSaving || pendingSave || updateRule.isPending;

  const getPreviewRule = React.useCallback(
    () => (isEditing ? (draftReaderRef.current?.() ?? rule) : rule),
    [isEditing, rule],
  );

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
          <RuleEditor
            formKeyBase={`global-rule:${isPendingNew ? 'new' : rule.id}:${ruleType}`}
            selectedRuleKey={null}
            initialRule={rule}
            questionId={null}
            questionType={null}
            questionMap={questionMap}
            onDraftEdit={handleDraftEdit}
            onDraftReaderChange={handleDraftReaderChange}
            onSave={(next) => void handleSave(next)}
            onCancel={handleCancelEdit}
            isSaving={editorSaving}
            error={displayError}
          />
        ) : (
          <RuleConfigAccordion value={rule} />
        )}

        <InlineRulePreview
          rule={rule}
          getRule={getPreviewRule}
          assessmentId={assessmentId}
        />
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
