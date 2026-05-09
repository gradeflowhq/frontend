import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@api';
import { invalidateRubricQueries } from '@api/queryInvalidation';
import { QK } from '@api/queryKeys';

import type { RuleValue } from './types';
import type {
  GetRuleSchemaAssessmentsAssessmentIdRulesSchemaGetParams,
  ListCompatibleRulesAssessmentsAssessmentIdRulesListGetParams,
  RuleCreateRequestRule,
  RuleUpdateRequestRule,
} from '@api/models';

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

export const useCompatibleRules = (
  assessmentId: string,
  params: ListCompatibleRulesAssessmentsAssessmentIdRulesListGetParams = {},
  enabled = true,
) => (
  useQuery({
    queryKey: QK.rules.compatible(assessmentId, params),
    queryFn: async () => {
      const response = await api.listCompatibleRulesAssessmentsAssessmentIdRulesListGet(
        assessmentId,
        params,
      );
      return response.data.rules;
    },
    enabled: enabled && Boolean(assessmentId),
  })
);

export const useRuleSchema = (
  assessmentId: string,
  params: GetRuleSchemaAssessmentsAssessmentIdRulesSchemaGetParams | null,
  enabled = true,
) => (
  useQuery({
    queryKey: QK.rules.schema(assessmentId, params),
    queryFn: async () => {
      if (!params) throw new Error('Rule type is required');
      const response = await api.getRuleSchemaAssessmentsAssessmentIdRulesSchemaGet(
        assessmentId,
        params,
      );
      return response.data;
    },
    enabled: enabled && Boolean(assessmentId) && params !== null,
  })
);
