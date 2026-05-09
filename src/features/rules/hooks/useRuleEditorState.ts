import React from 'react';

import { useRuleSchema } from '../api';
import { buildRuleUiSchema } from '../schemaUi';

import type { UiSchema } from '../schemaUi';
import type { RuleValue } from '../types';
import type { RuleSchemaResponse } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

const ruleFromSchema = (
  data: RuleSchemaResponse | undefined,
  initialRule: RuleValue | null | undefined,
): RuleValue => {
  const initialValue = (data?.initial_value ?? {}) as Record<string, unknown>;
  return { ...initialValue, ...(initialRule ?? {}) } as RuleValue;
};

interface UseRuleEditorStateOptions {
  assessmentId: string;
  selectedRuleType: string | null;
  initialRule?: RuleValue | null;
  questionId?: string | null;
  path?: string | null;
}

interface UseRuleEditorStateResult {
  draft: RuleValue;
  setDraft: (next: RuleValue) => void;
  schema: JSONSchema7 | null;
  uiSchema: UiSchema;
  ruleType: string | null;
  isLoading: boolean;
  error: unknown;
}

export const useRuleEditorState = ({
  assessmentId,
  selectedRuleType,
  initialRule,
  questionId,
  path,
}: UseRuleEditorStateOptions): UseRuleEditorStateResult => {
  const ruleType = selectedRuleType ?? initialRule?.type ?? null;
  const schemaParams = React.useMemo(() => {
    if (!ruleType) return null;
    return {
      type: ruleType,
      ...(questionId ? { question_id: questionId } : {}),
      ...(path ? { path } : {}),
    };
  }, [path, questionId, ruleType]);

  const schemaQuery = useRuleSchema(assessmentId, schemaParams);
  const schema = (schemaQuery.data?.schema as JSONSchema7 | undefined) ?? null;
  const uiSchema = React.useMemo(
    () => (schema ? buildRuleUiSchema(schema) : {}),
    [schema],
  );
  const [draft, setDraft] = React.useState<RuleValue>(() =>
    ruleFromSchema(schemaQuery.data, initialRule),
  );

  React.useEffect(() => {
    if (!schemaQuery.data) return;
    setDraft(ruleFromSchema(schemaQuery.data, initialRule));
  }, [initialRule, schemaQuery.data]);

  return {
    draft,
    setDraft,
    schema,
    uiSchema,
    ruleType,
    isLoading: schemaQuery.isLoading,
    error: schemaQuery.error,
  };
};
