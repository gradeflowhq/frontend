import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import rulesSchema from '@schemas/rules.json';
import type { RubricOutput } from './types';
import type { RuleValue, QuestionType } from './types';
import type { JSONSchema7 } from 'json-schema';

export type RuleDefinitions = Record<string, JSONSchema7>;

const extractProperties = (schema: JSONSchema7 | undefined): Record<string, unknown> => {
  if (!schema || typeof schema !== 'object') return {};
  const props = schema.properties;
  return props && typeof props === 'object' ? (props as Record<string, unknown>) : {};
};

const stringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const arr = value.filter((v): v is string => typeof v === 'string');
  return arr.length === value.length ? arr : undefined;
};

/**
 * Memoised access to rules schema definitions (rules.json).
 */
export const useRuleDefinitions = (): RuleDefinitions => {
  return useMemo(() => {
    const defs = (rulesSchema as { definitions?: RuleDefinitions } | RuleDefinitions)?.definitions ?? (rulesSchema as RuleDefinitions);
    return (defs ?? {}) as RuleDefinitions;
  }, []);
};

/**
 * Validate a prospective rubric change then save it when valid.
 * Usage:
 *   const validateAndReplace = useValidateAndReplaceRubric(assessmentId);
 *   await validateAndReplace.mutateAsync(nextRules);
 */
export const useValidateAndReplaceRubric = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rubric', assessmentId, 'validateAndReplace'],
    mutationFn: async (nextRules: RuleValue[]) => {
      // Validate against current question set
      const res = await api.validateRubricAssessmentsAssessmentIdRubricValidatePost(assessmentId, {
        use_stored_question_set: true,
        use_stored_rubric: false,
        rubric: { rules: nextRules as RubricOutput['rules'] },
      });
      const errs: string[] = res.data?.errors ?? [];
      if (errs.length > 0) {
        // Throw in the same shape ErrorAlert expects
        throw { response: { data: { errors: errs } } };
      }

      // Save rubric
      await api.setRubricByModelAssessmentsAssessmentIdRubricPut(assessmentId, {
        rubric: { rules: nextRules as RubricOutput['rules'] },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
    },
  });
};

/**
 * Replace rubric rules without running validation.
 * Use this when deleting rules (or when you explicitly want to skip validation).
 */
export const useReplaceRubric = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['rubric', assessmentId, 'replaceOnly'],
    mutationFn: async (nextRules: RuleValue[]) => {
      await api.setRubricByModelAssessmentsAssessmentIdRubricPut(assessmentId, {
        rubric: { rules: nextRules as RubricOutput['rules'] },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
    },
  });
};

/**
 * Compute compatible rule schema keys for a given question type and whether the rule
 * is single-target (has question_id) or multi-target.
 */
export const useCompatibleRuleKeys = (
  defs: RuleDefinitions,
  questionType?: QuestionType,
  singleTarget?: boolean
): string[] => {
  return useMemo(() => {
    const keys = Object.keys(defs ?? {});
    return keys.filter((key) => {
      const props = extractProperties(defs[key]);
      const hasQid = !!props.question_id;

      if (singleTarget === true && !hasQid) return false;
      if (singleTarget === false && hasQid) return false;

      const qt = props.question_types as { default?: unknown; enum?: unknown } | undefined;
      const allowed = stringArray(qt?.default) ?? stringArray(qt?.enum);

      return !questionType || !allowed || allowed.includes(questionType);
    });
  }, [defs, questionType, singleTarget]);
};

/**
 * Resolve a concrete schema key for a rule by its type (and optional question_id requirement).
 * Useful when editing an existing rule object.
 */
export const useFindSchemaKeyByType = (defs: RuleDefinitions) => {
  return (type: string, requireQuestionId?: boolean): string | null => {
    for (const k of Object.keys(defs)) {
      const props = extractProperties(defs[k]);
      const typeObj = props.type as { const?: unknown; default?: unknown } | undefined;
      const typeConst = (typeObj?.const ?? typeObj?.default) as string | undefined;
      const hasQid = !!props.question_id;
      if (typeConst === type && (requireQuestionId === undefined || requireQuestionId === hasQid)) return k;
    }
    return null;
  };
};