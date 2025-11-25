import React, { useMemo, useState } from 'react';
import { IconPlus } from '@components/ui/Icon';
import { Button } from '@components/ui/Button';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';

import RuleItem from './RuleItem';
import RuleDialog from './RuleDialog';

import {
  useRuleDefinitions,
  useValidateAndReplaceRubric,
  useCompatibleRuleKeys,
  useFindSchemaKeyByType,
  useReplaceRubric,
} from '../hooks';
import { friendlyRuleLabel } from '../helpers';

import type { QuestionSetOutputQuestionMap, RubricOutput } from '@api/models';
import type { RuleValue } from '../types';

type Props = {
  rubric: RubricOutput | null;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
};

const MultiTargetRulesSection: React.FC<Props> = ({ rubric, assessmentId, questionMap }) => {
  // Hooks must be called at the top level and unconditionally in a stable order
  const defs = useRuleDefinitions();
  const validateAndReplace = useValidateAndReplaceRubric(assessmentId);
  const replace = useReplaceRubric(assessmentId);
  const findKeyByType = useFindSchemaKeyByType(defs);

  // All rule schema keys that are multi-target (i.e., do not require question_id)
  const eligibleKeys = useCompatibleRuleKeys(defs, undefined as any, false);
  // Further restrict to keys named with "MultiQuestionRule"
  const multiRuleKeys = useMemo(
    () => eligibleKeys.filter((k) => k.includes('MultiQuestionRule')),
    [eligibleKeys]
  );

  // Local UI state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<RuleValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RuleValue | null>(null);

  // Reset helpers
  const resetRuleDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setSelectedRuleKey(null);
  };
  const resetDeleteConfirm = () => setDeleteTarget(null);

  const allRules: RuleValue[] = (rubric?.rules ?? []) as RuleValue[];
  // Multi-target rules are those without a string question_id
  const multiRules = useMemo(
    () => allRules.filter((r) => typeof (r as any)?.question_id !== 'string'),
    [allRules]
  );

  const handleAddDropdownSelect = (ruleKey: string) => {
    setSelectedRuleKey(ruleKey);
    setEditingRule(null);
    setDialogOpen(true);
  };

  // When editing, resolve the concrete schema key by the rule's type and open the dialog
  const handleEditRule = (rule: RuleValue) => {
    setEditingRule(rule);
    const type = String((rule as any)?.type);
    const key = findKeyByType(type, false); // multi-target => requireQuestionId = false
    setSelectedRuleKey(key);
    setDialogOpen(true);
  };

  const onSaveRuleDialog = async (ruleObj: any) => {
    let nextRules = [...allRules];
    if (editingRule) {
      nextRules = nextRules.map((r) => (r === editingRule ? (ruleObj as RuleValue) : r));
    } else {
      nextRules.push(ruleObj as RuleValue);
    }

    await validateAndReplace.mutateAsync(nextRules, { onSuccess: resetRuleDialog });
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Multi Target Rules</h3>

        <DropdownMenu trigger={<><IconPlus />Add Rule</>} align="end">
          {multiRuleKeys.map((key) => (
            <li key={key}>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleAddDropdownSelect(key)}
              >
                {friendlyRuleLabel(key)}
              </Button>
            </li>
          ))}
          {multiRuleKeys.length === 0 && (
            <li><span className="opacity-70 px-2 py-1">No multi-target rule types</span></li>
          )}
        </DropdownMenu>
      </div>

      {multiRules.length === 0 ? (
        <div className="alert alert-ghost"><span>No multi-target rules yet.</span></div>
      ) : (
        <div className="mt-2 space-y-3">
          {multiRules.map((r, idx) => (
            <RuleItem
              key={idx}
              rule={r}
              onEdit={handleEditRule}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
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
          const nextRules = allRules.filter((r) => r !== deleteTarget);
          await replace.mutateAsync(nextRules, { onSuccess: resetDeleteConfirm });
        }}
        onCancel={resetDeleteConfirm}
      />

      {replace.isError && <ErrorAlert error={replace.error} className="mt-3" />}
    </section>
  );
};

export default MultiTargetRulesSection;