import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { api } from '@api';
import { invalidateRubricQueries } from '@api/queryInvalidation';

import { findSchemaKeyByType, getRuleDefinitions } from './schema/lookup';

import type { RuleValue, QuestionType } from './types';
import type { RuleCreateRequestRule, RuleUpdateRequestRule } from '@api/models';
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
  return useMemo(() => getRuleDefinitions(), []);
};

export const useCreateRule = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rules', assessmentId, 'create'],
    mutationFn: async (rule: RuleValue) => {
      const response = await api.createRuleAssessmentsAssessmentIdRulesPost(assessmentId, {
        rule: rule as RuleCreateRequestRule,
      });
      return response.data;
    },
    onSuccess: async () => {
      await invalidateRubricQueries(qc, assessmentId);
    },
  });
};

export const useUpdateRule = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rules', assessmentId, 'update'],
    mutationFn: async ({ ruleId, rule }: { ruleId: string; rule: RuleValue }) => {
      await api.updateRuleAssessmentsAssessmentIdRulesRuleIdPut(assessmentId, ruleId, {
        rule: rule as RuleUpdateRequestRule,
      });
    },
    onSuccess: async () => {
      await invalidateRubricQueries(qc, assessmentId);
    },
  });
};

export const useDeleteRule = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rules', assessmentId, 'delete'],
    mutationFn: async (ruleId: string) => {
      await api.deleteRuleAssessmentsAssessmentIdRulesRuleIdDelete(assessmentId, ruleId);
    },
    onSuccess: async () => {
      await invalidateRubricQueries(qc, assessmentId);
    },
  });
};

export const useDeleteRules = (assessmentId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['rules', assessmentId, 'deleteMany'],
    mutationFn: async (ruleIds: string[]) => {
      const ids = [...new Set(ruleIds)];

      for (const id of ids) {
        await api.deleteRuleAssessmentsAssessmentIdRulesRuleIdDelete(assessmentId, id);
      }
    },
    onSuccess: async () => {
      await invalidateRubricQueries(qc, assessmentId);
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
  return useCallback((type: string, requireQuestionId?: boolean): string | null => {
    return findSchemaKeyByType(defs, type, requireQuestionId);
  }, [defs]);
};
