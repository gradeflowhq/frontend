import { Button, Modal, Menu, Alert, Group, Text, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import { getErrorMessages } from '@utils/error';

import RuleDialog from './RuleDialog';
import RuleItem from './RuleItem';
import { friendlyRuleLabel } from '../helpers';
import {
  useRuleDefinitions,
  useValidateAndReplaceRubric,
  useCompatibleRuleKeys,
  useFindSchemaKeyByType,
  useReplaceRubric,
} from '../hooks';

import type { RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';

type Props = {
  rubric: RubricOutput | null;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  searchQuery?: string;
};

const MultiTargetRulesSection: React.FC<Props> = ({ rubric, assessmentId, questionMap, searchQuery }) => {
  const defs = useRuleDefinitions();
  const validateAndReplace = useValidateAndReplaceRubric(assessmentId);
  const replace = useReplaceRubric(assessmentId);
  const findKeyByType = useFindSchemaKeyByType(defs);

  const eligibleKeys = useCompatibleRuleKeys(defs, undefined, false);
  const multiRuleKeys = useMemo(
    () => eligibleKeys.filter((k) => k.includes('MultiQuestionRule')),
    [eligibleKeys]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RuleValue | null>(null);

  const resetRuleDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setSelectedRuleKey(null);
  };

  const allRules = useMemo<RuleValue[]>(() => (rubric?.rules ?? []) as RuleValue[], [rubric]);
  const multiRules = useMemo(
    () => allRules.filter((r) => typeof (r as { question_id?: unknown } | null)?.question_id !== 'string'),
    [allRules]
  );

  const filteredMultiRules = useMemo(() => {
    const q = (searchQuery ?? '').trim().toLowerCase();
    if (!q) return multiRules;
    return multiRules.filter((r) => {
      const label = friendlyRuleLabel(r).toLowerCase();
      if (label.includes(q)) return true;
      return JSON.stringify(r ?? {}).toLowerCase().includes(q);
    });
  }, [multiRules, searchQuery]);

  const handleAddDropdownSelect = (ruleKey: string) => {
    setSelectedRuleKey(ruleKey);
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleEditRule = (rule: RuleValue) => {
    setEditingRule(rule);
    const type = String((rule as RuleValue | null)?.type ?? '');
    const key = findKeyByType(type, false);
    setSelectedRuleKey(key);
    setDialogOpen(true);
  };

  const onSaveRuleDialog = async (ruleObj: RuleValue) => {
    let nextRules = [...allRules];
    if (editingRule) {
      nextRules = nextRules.map((r) => (r === editingRule ? ruleObj : r));
    } else {
      nextRules.push(ruleObj);
    }
    await validateAndReplace.mutateAsync(nextRules, {
      onSuccess: () => {
        resetRuleDialog();
        notifications.show({ color: 'green', message: 'Rule saved' });
      },
      onError: () => notifications.show({ color: 'red', message: 'Save failed' }),
    });
  };

  return (
    <section style={{ marginTop: 24 }}>
      <Group justify="space-between" mb="sm">
        <Text fw={600} size="lg">Multi Target Rules</Text>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button size="xs" leftSection={<IconPlus size={14} />}>Add Rule</Button>
          </Menu.Target>
          <Menu.Dropdown>
            {multiRuleKeys.map((key) => (
              <Menu.Item key={key} onClick={() => handleAddDropdownSelect(key)}>
                {friendlyRuleLabel(key)}
              </Menu.Item>
            ))}
            {multiRuleKeys.length === 0 && (
              <Menu.Item disabled>No multi-target rule types</Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {filteredMultiRules.length === 0 ? (
        <Alert color="gray">No multi-target rules match your search.</Alert>
      ) : (
        <Stack gap="sm" mt="xs">
          {filteredMultiRules.map((r, idx) => (
            <RuleItem
              key={idx}
              rule={r}
              onEdit={handleEditRule}
              onDelete={setDeleteTarget}
            />
          ))}
        </Stack>
      )}

      <RuleDialog
        open={dialogOpen}
        selectedRuleKey={selectedRuleKey}
        initialRule={editingRule ?? undefined}
        questionMap={questionMap}
        onClose={resetRuleDialog}
        onSave={onSaveRuleDialog}
        isSaving={validateAndReplace.isPending}
        error={validateAndReplace.isError ? validateAndReplace.error : null}
        assessmentId={assessmentId}
      />

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Rule"
        size="sm"
      >
        <Text mb="md">Are you sure you want to delete this rule?</Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={() => setDeleteTarget(null)} disabled={replace.isPending}>
            Cancel
          </Button>
          <Button
            color="red"
            loading={replace.isPending}
            onClick={() => {
              if (!deleteTarget) return;
              const nextRules = allRules.filter((r) => r !== deleteTarget);
              void replace.mutateAsync(nextRules, {
                onSuccess: () => {
                  setDeleteTarget(null);
                  notifications.show({ color: 'green', message: 'Rule deleted' });
                },
                onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
              });
            }}
          >
            Delete
          </Button>
        </Group>
      </Modal>

      {replace.isError && (
        <Alert color="red" mt="sm">{getErrorMessages(replace.error).join(' ')}</Alert>
      )}
    </section>
  );
};

export default MultiTargetRulesSection;
