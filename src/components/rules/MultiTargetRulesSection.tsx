import React, { useMemo, useState } from 'react';
import { IconPlus } from '../ui/Icon';
import { DropdownMenu } from '../ui/DropdownMenu';
import { Button } from '../ui/Button';
import RuleItem from './RuleItem';
import RuleDialog from './RuleDialog';
import rulesSchema from '../../schemas/rules.json';
import ErrorAlert from '../common/ErrorAlert';
import ConfirmDialog from '../common/ConfirmDialog';
import { api } from '../../api';
import type { QuestionSetOutputQuestionMap, RubricOutput } from '../../api/models';
import { friendlyRuleLabel } from '../../utils/rulesHelpers';

type Props = {
  rubric: RubricOutput | null;
  onReplaceRubric: (next: RubricOutput) => Promise<void> | void;
  saving?: boolean;
  error?: unknown;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
};

const MultiTargetRulesSection: React.FC<Props> = ({
  rubric,
  onReplaceRubric,
  saving,
  error,
  assessmentId,
  questionMap,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [validateError, setValidateError] = useState<unknown | null>(null);
  const [validating, setValidating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const allRules = rubric?.rules ?? [];
  const multiRules = useMemo(() => allRules.filter((r) => typeof r?.question_id !== 'string'), [allRules]);

  const ruleDefs: Record<string, any> = (rulesSchema as any)?.definitions ?? (rulesSchema as any);
  const multiQuestionRuleKeys = useMemo(() => {
    return Object.keys(ruleDefs).filter((key) => {
      const def = ruleDefs[key];
      const props = def?.properties ?? {};
      return !props?.question_id && !!props?.question_types && key.includes('MultiQuestionRule');
    });
  }, [ruleDefs]);

  const handleAddDropdownSelect = (ruleKey: string) => {
    setValidateError(null);
    setSelectedRuleKey(ruleKey);
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleEdit = (rule: any) => {
    setValidateError(null);
    setEditingRule(rule);
    setSelectedRuleKey(null); // union fallback
    setDialogOpen(true);
  };

  const handleDelete = async (rule: any) => {
    setDeleteTarget(rule);
  };

  const handleSaveDialog = async (ruleObj: any) => {
    let nextRules = [...allRules];
    if (editingRule) {
      nextRules = nextRules.map((r) => (r === editingRule ? ruleObj : r));
    } else {
      nextRules.push(ruleObj);
    }

    setValidating(true);
    setValidateError(null);
    try {
      const res = await api.validateRubricAssessmentsAssessmentIdRubricValidatePost(assessmentId, {
        use_stored_question_set: true,
        use_stored_rubric: false,
        rubric: { rules: nextRules },
      });
      const errs: string[] = res.data?.errors ?? [];
      if (errs.length > 0) {
        setValidateError({ response: { data: { errors: errs } } });
      } else {
        await onReplaceRubric({ rules: nextRules });
        setDialogOpen(false);
        setEditingRule(null);
        setSelectedRuleKey(null);
      }
    } catch (e) {
      setValidateError(e);
    } finally {
      setValidating(false);
    }
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Multi Target Rules</h3>

        <DropdownMenu trigger={<><IconPlus />Add Rule</>} align="end">
          {multiQuestionRuleKeys.map((key) => (
            <li key={key}>
              <Button variant="ghost" className="justify-start" onClick={() => handleAddDropdownSelect(key)}>
                {friendlyRuleLabel(key)}
              </Button>
            </li>
          ))}
          {multiQuestionRuleKeys.length === 0 && (
            <li><span className="opacity-70 px-2 py-1">No multi-target rule types</span></li>
          )}
        </DropdownMenu>
      </div>

      {multiRules.length === 0 ? (
        <div className="alert alert-info"><span>No multi-target rules yet.</span></div>
      ) : (
        <div className="mt-2 space-y-3">
          {multiRules.map((r, idx) => (
            <RuleItem key={idx} rule={r} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <RuleDialog
        open={dialogOpen}
        selectedRuleKey={selectedRuleKey}
        initialRule={editingRule ?? undefined}
        questionMap={questionMap}
        onClose={() => {
          setDialogOpen(false);
          setEditingRule(null);
          setSelectedRuleKey(null);
          setValidateError(null);
        }}
        onSave={handleSaveDialog}
        isSaving={saving || validating}
        error={validateError ?? (error ?? null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Rule"
        message="Are you sure you want to delete this rule?"
        confirmText={saving ? 'Deleting...' : 'Delete'}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const nextRules = allRules.filter((r) => r !== deleteTarget);
          await onReplaceRubric({ rules: nextRules });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {error && <ErrorAlert error={error} className="mt-3" />}
    </section>
  );
};

export default MultiTargetRulesSection;