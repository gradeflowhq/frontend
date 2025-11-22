import React, { useMemo, useState } from 'react';
import RuleItem from './RuleItem';
import RuleDialog from './RuleDialog';
import rulesSchema from '../../schemas/rules.json';
import ErrorAlert from '../common/ErrorAlert';
import { api } from '../../api';
import type { RubricOutput } from '../../api/models';
import { friendlyRuleLabel, findSchemaKeyByType } from '../../utils/rulesHelpers';

type Props = {
  rubric: RubricOutput | null;
  questionIds: string[];
  questionTypesById: Record<string, string>;
  onReplaceRubric: (next: RubricOutput) => Promise<void> | void;
  saving?: boolean;
  error?: unknown;
  assessmentId: string;
};

const SingleTargetRulesSection: React.FC<Props> = ({
  rubric,
  questionIds,
  questionTypesById,
  onReplaceRubric,
  saving,
  error,
  assessmentId,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);
  const [editingForQid, setEditingForQid] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [validateError, setValidateError] = useState<unknown | null>(null);
  const [validating, setValidating] = useState(false);

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

  const handleDelete = async (_qid: string, rule: any) => {
    const nextRules = allRules.filter((r) => r !== rule);
    await onReplaceRubric({ rules: nextRules });
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
      {/* Section wrapper */}
      {/* <div className="card bg-base-100 shadow-xs">
        <div className="card-body"> */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Single Target Rules</h3>
          </div>

          {questionIds.length === 0 && (
            <div className="alert alert-info mt-3">
              <span>No questions found. Infer or set a question set first.</span>
            </div>
          )}

          {/* Questions list */}
          <div className="mt-3 space-y-3">
            {questionIds.map((qid) => {
              const qType = questionTypesById[qid] ?? 'TEXT';
              const rules = byQuestion[qid] ?? [];
              const options = compatibleKeysFor(qType);

              return (
                <div key={qid} className="card bg-base-100 border border-base-300 shadow-xs">
                  <div className="card-body">
                    {/* Question header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm">
                          <span className="font-semibold">{qid}</span>
                        </div>
                        <span className="badge badge-ghost">{qType}</span>
                        {rules.length > 0 && (
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </span>
                        )}
                      </div>

                      {/* Add rule dropdown */}
                      <div className="dropdown dropdown-end">
                        <button className="btn btn-sm btn-primary" tabIndex={0}>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                          </svg>
                          Add Rule
                        </button>
                        <ul
                          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-64"
                          tabIndex={0}
                        >
                          {options.map((key) => (
                            <li key={key}>
                              <button
                                className="btn btn-ghost justify-start"
                                onClick={() => handleAddDropdownSelect(qid, key)}
                              >
                                {friendlyRuleLabel(key)}
                              </button>
                            </li>
                          ))}
                          {options.length === 0 && (
                            <li>
                              <span className="opacity-70 px-2 py-1">No compatible rules</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Rules list */}
                    {rules.length === 0 ? (
                      <div className="mt-3">
                        <div className="alert alert-ghost">
                          <span className="opacity-70">No rules for this question yet.</span>
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

          {/* Validation/Mutation error outside the dialog, if needed */}
          {error && <ErrorAlert error={error} className="mt-3" />}
        {/* </div>
      </div> */}

      {/* Dialog */}
      <RuleDialog
        open={dialogOpen}
        selectedRuleKey={selectedRuleKey}
        initialRule={editingRule ?? undefined}
        questionId={editingForQid ?? undefined}
        questionType={editingForQid ? questionTypesById[editingForQid] : undefined}
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
    </section>
  );
};

export default SingleTargetRulesSection;