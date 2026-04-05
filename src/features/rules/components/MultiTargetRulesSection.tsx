import { Box, Button, Modal, Menu, Alert, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import { getErrorMessage } from '@utils/error';

import RuleCard from './RuleCard';
import RuleDialog from './RuleDialog';
import {
  useRuleDefinitions,
  useValidateAndReplaceRubric,
  useCompatibleRuleKeys,
  useFindSchemaKeyByType,
  useReplaceRubric,
} from '../api';
import { friendlyRuleLabel } from '../schema';

import type { RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';

type Props = {
  rubric: RubricOutput | null;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  searchQuery?: string;
  highlightedRule?: RuleValue | null;
};

const MultiTargetRulesSection: React.FC<Props> = ({ rubric, assessmentId, questionMap, searchQuery, highlightedRule }) => {
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
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const resetRuleDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setEditingRuleIndex(null);
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
    setEditingRuleIndex(allRules.indexOf(rule));
    const type = String((rule as RuleValue | null)?.type ?? '');
    const key = findKeyByType(type, false);
    setSelectedRuleKey(key);
    setDialogOpen(true);
  };

  const onSaveRuleDialog = async (ruleObj: RuleValue) => {
    let nextRules = [...allRules];
    if (editingRuleIndex !== null) {
      nextRules = nextRules.map((r, i) => (i === editingRuleIndex ? ruleObj : r));
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
    <section>
      <Group justify="flex-end" mb="sm">
        <Menu position="bottom-end">
          <Menu.Target>
            <Button size="xs" leftSection={<IconPlus size={14} />}>Add Global Rule</Button>
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
        <Alert color="gray">No global rules configured.</Alert>
      ) : (
        <Stack gap="sm" mt="xs">
          {filteredMultiRules.map((r, idx) => (
            <Box
              key={idx}
              style={{
                borderRadius: 8,
                transition: 'background 500ms',
                background: r === highlightedRule ? 'var(--mantine-color-yellow-0)' : undefined,
                outline: r === highlightedRule ? '1px solid var(--mantine-color-yellow-4)' : undefined,
              }}
            >
              <RuleCard
                rule={r}
                onEdit={handleEditRule}
                onDelete={(rule) => setDeleteTarget(allRules.indexOf(rule))}
              />
            </Box>
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
        opened={deleteTarget !== null}
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
              if (deleteTarget === null) return;
              const nextRules = allRules.filter((_, i) => i !== deleteTarget);
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
        <Alert color="red" mt="sm">{getErrorMessage(replace.error)}</Alert>
      )}
    </section>
  );
};

export default MultiTargetRulesSection;
