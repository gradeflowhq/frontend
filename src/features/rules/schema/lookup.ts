import rulesSchema from '@schemas/rules.json';

import type { JSONSchema7 } from 'json-schema';

export const getRuleDefinitions = (): Record<string, JSONSchema7> => {
  const defs = (rulesSchema as { definitions?: Record<string, JSONSchema7> } | Record<string, JSONSchema7>)?.definitions ?? (rulesSchema as Record<string, JSONSchema7>);
  return (defs ?? {}) as Record<string, JSONSchema7>;
};

const getSchemaStringValue = (schema: unknown): string | null => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return null;
  const value =
    (schema as { const?: unknown; default?: unknown }).const ??
    (schema as { default?: unknown }).default;
  return typeof value === 'string' ? value : null;
};

const ruleLabelLookup = (() => {
  const lookup = new Map<string, string>();

  for (const [key, def] of Object.entries(getRuleDefinitions())) {
    const props = def?.properties as Record<string, unknown> | undefined;
    const label = getSchemaStringValue(props?.display_name);
    if (!label) continue;

    lookup.set(key, label);

    const type = getSchemaStringValue(props?.type);
    if (type) {
      lookup.set(type, label);
    }
  }

  return lookup;
})();

export const friendlyRuleLabel = (key: unknown): string => {
  const raw = typeof key === 'string' ? key : key != null ? String(key) : '';
  if (!raw) return 'Unknown rule';
  const cached = ruleLabelLookup.get(raw);
  if (cached) return cached;
  // Fallback: strip known suffixes and split camelCase
  const stripped = raw
    .replace(/MultiQuestionRule$/, '')
    .replace(/QuestionRule$/, '')
    .replace(/Rule$/, '');
  if (!stripped) return raw;
  return stripped.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const prettifyKey = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const findSchemaKeyByType = (
  defs: Record<string, JSONSchema7>,
  type: string,
  requireQuestionId?: boolean
): string | null => {
  for (const k of Object.keys(defs)) {
    const props = defs[k]?.properties as Record<string, unknown> | undefined;
    const typeObj = props?.type as { const?: unknown; default?: unknown } | undefined;
    const typeConst = (typeObj?.const ?? typeObj?.default) as string | undefined;
    const hasQid = !!props?.question_id;
    if (typeConst === type && (requireQuestionId === undefined || requireQuestionId === hasQid)) {
      return k;
    }
  }
  return null;
};

export const isRuleObject = (obj: unknown, defs: Record<string, JSONSchema7>): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const t = (obj as { type?: unknown }).type;
  if (typeof t !== 'string') return false;
  const key = findSchemaKeyByType(defs, t, !!(obj as { question_id?: unknown }).question_id);
  return !!key;
};

/**
 * Returns true when the rule object is a multi-target (global) rule,
 * i.e. it does NOT have a direct `question_id` field.
 */
export const isMultiTargetRule = (rule: unknown): boolean =>  !rule ||
  typeof rule !== 'object' ||  typeof (rule as { question_id?: unknown }).question_id !== 'string';

/**
 * Extracts all question IDs targeted by a rule (single or multi-target).
 * Mirrors the engine's `get_target_question_ids()` logic.
 */
export const getRuleTargetQids = (rule: unknown): string[] => {
  const qids = new Set<string>();

  // Single-target rule: direct question_id
  const directQid = (rule as { question_id?: unknown }).question_id;
  if (typeof directQid === 'string') qids.add(directQid);

  // Top-level explicit question_ids array (legacy / simple multi)
  const topQids = (rule as { question_ids?: unknown }).question_ids;
  if (Array.isArray(topQids)) {
    for (const qid of topQids) {
      if (typeof qid === 'string') qids.add(qid);
    }
  }

  // ASSUMPTION_SET_MULTI: assumptions[].rules[].question_id
  const assumptions = (rule as { assumptions?: unknown }).assumptions;
  if (Array.isArray(assumptions)) {
    for (const assumption of assumptions) {
      const subRules = (assumption as { rules?: unknown }).rules;
      if (Array.isArray(subRules)) {
        for (const r of subRules) {
          const qid = (r as { question_id?: unknown }).question_id;
          if (typeof qid === 'string') qids.add(qid);
        }
      }
    }
  }

  // CONDITIONAL: then_rules and else_rules only
  // (if_rules are condition checks, not grading targets — matches engine behaviour)
  for (const field of ['then_rules', 'else_rules']) {
    const subRules = (rule as Record<string, unknown>)[field];
    if (Array.isArray(subRules)) {
      for (const r of subRules) {
        const qid = (r as { question_id?: unknown }).question_id;
        if (typeof qid === 'string') qids.add(qid);
      }
    }
  }

  return Array.from(qids);
};