import rulesSchema from '@schemas/rules.json';
import type { JSONSchema7 } from 'json-schema';

export const getRuleDefinitions = (): Record<string, JSONSchema7> => {
  const defs = (rulesSchema as { definitions?: Record<string, JSONSchema7> } | Record<string, JSONSchema7>)?.definitions ?? (rulesSchema as Record<string, JSONSchema7>);
  return (defs ?? {}) as Record<string, JSONSchema7>;
};

export const friendlyRuleLabel = (key: unknown): string => {
  const raw = typeof key === 'string' ? key : key != null ? String(key) : '';
  if (!raw) return 'Unknown rule';

  const withoutSuffix = raw.replace(/(QuestionRule|MultiQuestionRule|Rule)$/, '');
  const spaced = withoutSuffix.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return spaced || raw;
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