import { Button, Modal, Menu, Alert, Card, Group, Text, Badge, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCircleCheck, IconPlus } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

import { getErrorMessage } from '@utils/error';

import RuleDialog from './RuleDialog';
import RuleItem from './RuleItem';
import { friendlyRuleLabel } from '../helpers';
import { useRuleDefinitions, useValidateAndReplaceRubric, useCompatibleRuleKeys, useFindSchemaKeyByType, useReplaceRubric } from '../hooks';

import type { RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';

type Props = {
  rubric: RubricOutput | null;
  questionIds: string[];
  questionTypesById: Record<string, string>;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  coveredQuestionIds: Set<string>;
  searchQuery?: string;
  coveringRuleByQid?: Record<string, RuleValue>;
  onViewGlobalRule?: (qid: string) => void;
};

const SingleTargetRulesSection: React.FC<Props> = ({
  rubric,
  questionIds,
  questionTypesById,
  assessmentId,
  questionMap,
  coveredQuestionIds,
  searchQuery,
  coveringRuleByQid,
  onViewGlobalRule,
}) => {
  const defs = useRuleDefinitions();
  const validateAndReplace = useValidateAndReplaceRubric(assessmentId);
  const replace = useReplaceRubric(assessmentId);
  const findKeyByType = useFindSchemaKeyByType(defs);
  const singleTargetRuleKeys = useCompatibleRuleKeys(defs, undefined, true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [editingForQid, setEditingForQid] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleValue | null>(null);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ qid: string; index: number } | null>(null);

  const resetRuleDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setEditingRuleIndex(null);
    setEditingForQid(null);
    setSelectedRuleKey(null);
  };

  const allRules = useMemo<RuleValue[]>(() => (rubric?.rules ?? []) as RuleValue[], [rubric]);

  const byQuestion = useMemo(() => {
    const map: Record<string, RuleValue[]> = {};
    for (const r of allRules) {
      const qid = (r as { question_id?: unknown } | null)?.question_id;
      if (typeof qid === 'string') {
        if (!map[qid]) map[qid] = [];
        map[qid].push(r);
      }
    }
    return map;
  }, [allRules]);

  const matchesRule = (rule: RuleValue, q: string) => {
    const label = friendlyRuleLabel(rule).toLowerCase();
    if (label.includes(q)) return true;
    return JSON.stringify(rule ?? {}).toLowerCase().includes(q);
  };

  const filteredQuestionIds = useMemo(() => {
    const q = (searchQuery ?? '').trim().toLowerCase();
    if (!q) return questionIds;
    return questionIds.filter((qid) => {
      const type = (questionTypesById[qid] ?? '').toLowerCase();
      if (qid.toLowerCase().includes(q)) return true;
      if (type.includes(q)) return true;
      return (byQuestion[qid] ?? []).some((r) => matchesRule(r, q));
    });
  }, [questionIds, questionTypesById, byQuestion, searchQuery]);

  const compatibleKeysFor = (questionType: string) =>
    singleTargetRuleKeys.filter((key) => {
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

  const handleAddDropdownSelect = (qid: string, ruleKey: string) => {
    setEditingForQid(qid);
    setEditingRule(null);
    setSelectedRuleKey(ruleKey);
    setDialogOpen(true);
  };

  const handleEdit = (qid: string, rule: RuleValue) => {
    setEditingForQid(qid);
    const key = findKeyByType(String(rule.type ?? ''), true);
    setSelectedRuleKey(key);
    setEditingRule(rule);
    setEditingRuleIndex(allRules.indexOf(rule));
    setDialogOpen(true);
  };

  const onSaveRuleDialog = async (ruleObj: RuleValue) => {
    if (!editingForQid) return;
    const nextRule = { ...ruleObj, question_id: editingForQid } as RuleValue;
    const nextRules = editingRuleIndex !== null
      ? allRules.map((r, i) => (i === editingRuleIndex ? nextRule : r))
      : [...allRules, nextRule];

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

      {questionIds.length === 0 && (
        <Alert color="blue" mt="sm">No questions found. Infer or set a question set first.</Alert>
      )}

      <Stack gap="sm" mt="sm">
        {filteredQuestionIds.length === 0 && (
          <Alert color="gray">No questions match your search.</Alert>
        )}

        {filteredQuestionIds.map((qid) => {
          const qType = questionTypesById[qid] ?? 'TEXT';
          const rules = byQuestion[qid] ?? [];
          const options = compatibleKeysFor(qType);
          const isCovered = coveredQuestionIds.has(qid);
          const canAddRule = !isCovered;

          return (
            <Card key={qid} withBorder shadow="xs">
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <Text ff="monospace" size="sm" fw={600}>{qid}</Text>
                  <Badge variant="light" color="gray">{qType}</Badge>
                </Group>
                {canAddRule ? (
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <Button size="xs" leftSection={<IconPlus size={14} />}>Add Rule</Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {options.map((key) => (
                        <Menu.Item key={key} onClick={() => handleAddDropdownSelect(qid, key)}>
                          {friendlyRuleLabel(key)}
                        </Menu.Item>
                      ))}
                      {options.length === 0 && (
                        <Menu.Item disabled>No compatible rules</Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                ) : (
                  <IconCircleCheck color="var(--mantine-color-green-6)" />
                )}
              </Group>

              {rules.length === 0 ? (
                isCovered ? (
                  <Group gap="xs" align="center">
                    <Text size="sm" c="dimmed">
                      Covered by {coveringRuleByQid?.[qid] ? friendlyRuleLabel(coveringRuleByQid[qid]) : 'global rule'}
                    </Text>
                    {onViewGlobalRule && (
                      <Button size="xs" variant="subtle" onClick={() => onViewGlobalRule(qid)}>View</Button>
                    )}
                  </Group>
                ) : (
                  <Alert color="gray" variant="light">No rule for this question yet.</Alert>
                )
              ) : (
                <Stack gap="sm" mt="xs">
                  {rules.map((r, idx) => (
                    <RuleItem
                      key={idx}
                      rule={r}
                      onEdit={(rule) => handleEdit(qid, rule)}
                      onDelete={(rule) => setDeleteTarget({ qid, index: allRules.indexOf(rule) })}
                      contextQuestionId={qid}
                    />
                  ))}
                </Stack>
              )}
            </Card>
          );
        })}
      </Stack>

      <RuleDialog
        open={dialogOpen}
        selectedRuleKey={selectedRuleKey}
        initialRule={editingRule ?? undefined}
        questionId={editingForQid ?? undefined}
        questionType={editingForQid ? questionTypesById[editingForQid] : undefined}
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
              const nextRules = allRules.filter((_, i) => i !== deleteTarget.index);
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

export default SingleTargetRulesSection;
