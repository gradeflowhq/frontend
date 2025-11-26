import React, { useMemo, useState } from 'react';
import { IconCheckCircle, IconPlus } from '@components/ui/Icon';
import { Button } from '@components/ui/Button';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';

import RuleItem from './RuleItem';
import RuleDialog from './RuleDialog';

import { useRuleDefinitions, useValidateAndReplaceRubric, useCompatibleRuleKeys, useFindSchemaKeyByType, useReplaceRubric } from '../hooks';
import { friendlyRuleLabel } from '../helpers';
import type { QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';
import type { RuleValue } from '../types';

type Props = {
  rubric: RubricOutput | null;
  questionIds: string[];
  questionTypesById: Record<string, string>;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  coveredQuestionIds: Set<string>;
};

const SingleTargetRulesSection: React.FC<Props> = ({
  rubric,
  questionIds,
  questionTypesById,
  assessmentId,
  questionMap,
  coveredQuestionIds,
}) => {
  // Hooks must be called unconditionally
  const defs = useRuleDefinitions();
  const validateAndReplace = useValidateAndReplaceRubric(assessmentId);
  const replace = useReplaceRubric(assessmentId);
  const findKeyByType = useFindSchemaKeyByType(defs);
  // All single-target rule schema keys (question_id present)
  const singleTargetRuleKeys = useCompatibleRuleKeys(defs, undefined as any, true);

  // Local UI state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [editingForQid, setEditingForQid] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ qid: string; rule: RuleValue } | null>(null);

  // Reset helpers
  const resetRuleDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setEditingForQid(null);
    setSelectedRuleKey(null);
  };
  const resetDeleteConfirm = () => setDeleteTarget(null);

  const allRules: RuleValue[] = (rubric?.rules ?? []) as RuleValue[];

  // Group rules by question_id
  const byQuestion = useMemo(() => {
    const map: Record<string, RuleValue[]> = {};
    for (const r of allRules) {
      const qid = (r as any)?.question_id;
      if (typeof qid === 'string') {
        if (!map[qid]) map[qid] = [];
        map[qid].push(r);
      }
    }
    return map;
  }, [allRules]);

  // Filter schema keys compatible with a question's type
  const compatibleKeysFor = (questionType: string) =>
    singleTargetRuleKeys.filter((key) => {
      const props = defs[key]?.properties ?? {};
      const allowed =
        Array.isArray(props?.question_types?.default)
          ? props.question_types.default
          : Array.isArray(props?.question_types?.enum)
          ? props.question_types.enum
          : undefined;
      return !allowed || allowed.includes(questionType);
    });

  const handleAddDropdownSelect = (qid: string, ruleKey: string) => {
    setEditingForQid(qid);
    setEditingRule(null);
    setSelectedRuleKey(ruleKey);
    setDialogOpen(true);
  };

  const handleEdit = (qid: string, rule: RuleValue) => {
    setEditingForQid(qid);
    const key = findKeyByType(String((rule as any)?.type), true);
    setSelectedRuleKey(key);
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const onSaveRuleDialog = async (ruleObj: any) => {
    if (!editingForQid) return;
    const nextRule = { ...ruleObj, question_id: editingForQid } as RuleValue;
    const nextRules = editingRule
      ? allRules.map((r) => (r === editingRule ? nextRule : r))
      : [...allRules, nextRule];

    await validateAndReplace.mutateAsync(nextRules, { onSuccess: resetRuleDialog });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Single Target Rules</h3>
      </div>

      {questionIds.length === 0 && (
        <div className="alert alert-info mt-3">
          <span>No questions found. Infer or set a question set first.</span>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {questionIds.map((qid) => {
          const qType = questionTypesById[qid] ?? 'TEXT';
          const rules = byQuestion[qid] ?? [];
          const options = compatibleKeysFor(qType);

          const isCovered = coveredQuestionIds.has(qid);
          const canAddRule = !isCovered;

          return (
            <div key={qid} className="card bg-base-100 border border-base-300 shadow-xs">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-sm">
                      <span className="font-semibold">{qid}</span>
                    </div>
                    <span className="badge badge-ghost">{qType}</span>
                  </div>

                  {canAddRule ? (
                    <DropdownMenu trigger={<><IconPlus />Add Rule</>} align="end">
                      {options.map((key) => (
                        <li key={key}>
                          <Button
                            variant="ghost"
                            className="justify-start"
                            onClick={() => handleAddDropdownSelect(qid, key)}
                          >
                            {friendlyRuleLabel(key)}
                          </Button>
                        </li>
                      ))}
                      {options.length === 0 && (
                        <li>
                          <span className="opacity-70 px-2 py-1">No compatible rules</span>
                        </li>
                      )}
                    </DropdownMenu>
                  ) : (
                    <IconCheckCircle />
                  )}
                </div>

                {rules.length === 0 ? (
                  <div className="mt-3">
                    {isCovered ? (
                        <div className="border border-base-300 bg-base-100 rounded-md p-3 shadow-xs">
                            <span>Covered by multi-target rule.</span>
                        </div>
                    ) : (
                        <div className="alert alert-ghost">
                            <span>No rule for this question yet.</span>
                        </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {rules.map((r, idx) => (
                      <RuleItem
                        key={idx}
                        rule={r}
                        onEdit={(rule) => handleEdit(qid, rule)}
                        onDelete={(rule) => setDeleteTarget({ qid, rule })}
                        contextQuestionId={qid}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rule"
        message="Are you sure you want to delete this rule?"
        confirmLoading={replace.isPending}
        confirmLoadingLabel="Deleting..."
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const nextRules = allRules.filter((r) => r !== deleteTarget.rule);
          await replace.mutateAsync(nextRules, { onSuccess: resetDeleteConfirm });
        }}
        onCancel={resetDeleteConfirm}
      />

      {replace.isError && <ErrorAlert error={replace.error} className="mt-3" />}
    </section>
  );
};

export default SingleTargetRulesSection;