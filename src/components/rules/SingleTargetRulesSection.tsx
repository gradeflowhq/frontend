import React, { useMemo, useState } from 'react';
import { IconCheckCircle, IconPlus } from '../ui/Icon';
import { DropdownMenu } from '../ui/DropdownMenu';
import { Button } from '../ui/Button';
import RuleItem from './RuleItem';
import RuleDialog from './RuleDialog';
import rulesSchema from '../../schemas/rules.json';
import ErrorAlert from '../common/ErrorAlert';
import ConfirmDialog from '../common/ConfirmDialog';
import { api } from '../../api';
import type { QuestionSetOutputQuestionMap, RubricOutput } from '../../api/models';
import { friendlyRuleLabel, findSchemaKeyByType } from '../../utils/rulesHelpers';

type Props = {
  rubric: RubricOutput | null;
  questionIds: string[];
  questionTypesById: Record<string, string>;
  onReplaceRubric: (next: RubricOutput) => Promise<void> | void;
  saving?: boolean;
  error?: unknown;
  assessmentId: string;
  questionMap: QuestionSetOutputQuestionMap;
  coveredQuestionIds: Set<string>;
};

const SingleTargetRulesSection: React.FC<Props> = ({
  rubric,
  questionIds,
  questionTypesById,
  onReplaceRubric,
  saving,
  error,
  assessmentId,
  questionMap,
  coveredQuestionIds,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [editingForQid, setEditingForQid] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [validateError, setValidateError] = useState<unknown | null>(null);
  const [validating, setValidating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ qid: string; rule: any } | null>(null);

  const allRules = rubric?.rules ?? [];

  const byQuestion = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of allRules) {
      const qid = r?.question_id;
      if (typeof qid === 'string') {
        if (!map[qid]) map[qid] = [];
        map[qid].push(r);
      }
    }
    return map;
  }, [allRules]);

  const ruleDefs: Record<string, any> = (rulesSchema as any)?.definitions ?? (rulesSchema as any);
  const singleTargetRuleKeys = useMemo(() => {
    return Object.keys(ruleDefs).filter((key) => {
      const def = ruleDefs[key];
      const props = def?.properties ?? {};
      return props?.question_id && props?.question_types;
    });
  }, [ruleDefs]);

  const compatibleKeysFor = (questionType: string) =>
    singleTargetRuleKeys.filter((key) => {
      const def = ruleDefs[key];
      const enums: string[] | undefined = def?.properties?.question_types?.default;
      return Array.isArray(enums) ? enums.includes(questionType) : false;
    });

  const handleAddDropdownSelect = (qid: string, ruleKey: string) => {
    setValidateError(null);
    setEditingForQid(qid);
    setEditingRule(null);
    setSelectedRuleKey(ruleKey);
    setDialogOpen(true);
  };

  const handleEdit = (qid: string, rule: any) => {
    setValidateError(null);
    setEditingForQid(qid);
    const key = findSchemaKeyByType(ruleDefs, String(rule?.type));
    setSelectedRuleKey(key);
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleDelete = async (qid: string, rule: any) => {
    setDeleteTarget({ qid, rule });
  };

  const handleSaveDialog = async (ruleObj: any) => {
    if (!editingForQid) return;
    const nextRule = { ...ruleObj, question_id: editingForQid };
    let nextRules = [...allRules];
    if (editingRule) nextRules = nextRules.map((r) => (r === editingRule ? nextRule : r));
    else nextRules.push(nextRule);

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
        setEditingForQid(null);
        setSelectedRuleKey(null);
      }
    } catch (e) {
      setValidateError(e);
    } finally {
      setValidating(false);
    }
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
                  )
                  }
                </div>

                {rules.length === 0 ? (
                  <div className="mt-3">
                    <div className="alert alert-ghost">
                      {isCovered ? 'Covered by multi-target rule(s).' : 'No rules for this question yet.'}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {rules.map((r, idx) => (
                      <RuleItem
                        key={idx}
                        rule={r}
                        onEdit={(rule) => handleEdit(qid, rule)}
                        onDelete={(rule) => handleDelete(qid, rule)}
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

      {error && <ErrorAlert error={error} className="mt-3" />}

      <RuleDialog
        open={dialogOpen}
        selectedRuleKey={selectedRuleKey}
        initialRule={editingRule ?? undefined}
        questionId={editingForQid ?? undefined}
        questionType={editingForQid ? questionTypesById[editingForQid] : undefined}
        questionMap={questionMap}
        onClose={() => {
          setDialogOpen(false);
          setEditingRule(null);
          setEditingForQid(null);
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
          const nextRules = allRules.filter((r) => r !== deleteTarget.rule);
          await onReplaceRubric({ rules: nextRules });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
};

export default SingleTargetRulesSection;