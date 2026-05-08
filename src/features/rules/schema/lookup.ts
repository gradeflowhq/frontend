import rulesSchema from '@schemas/rules.json';

import type { JSONSchema7 } from 'json-schema';

export const getRuleDefinitions = (): Record<string, JSONSchema7> => {
  const defs = (rulesSchema as { definitions?: Record<string, JSONSchema7> } | Record<string, JSONSchema7>)?.definitions ?? (rulesSchema as Record<string, JSONSchema7>);
  return (defs ?? {}) as Record<string, JSONSchema7>;
};

export type RuleScope = 'question' | 'global';

const getSchemaStringValue = (schema: unknown): string | null => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return null;
  const value =
    (schema as { const?: unknown; default?: unknown }).const ??
    (schema as { default?: unknown }).default;
  return typeof value === 'string' ? value : null;
};

export const getRuleScope = (props: Record<string, unknown> | undefined): RuleScope | null => {
  const scope = getSchemaStringValue(props?.scope);
  return scope === 'question' || scope === 'global' ? scope : null;
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
  scope: RuleScope,
): string | null => {
  for (const k of Object.keys(defs)) {
    const props = defs[k]?.properties as Record<string, unknown> | undefined;
    const typeObj = props?.type as { const?: unknown; default?: unknown } | undefined;
    const typeConst = (typeObj?.const ?? typeObj?.default) as string | undefined;
    const ruleScope = getRuleScope(props);
    if (typeConst === type && ruleScope === scope) {
      return k;
    }
  }
  return null;
};

export const isRuleObject = (obj: unknown, defs: Record<string, JSONSchema7>): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const t = (obj as { type?: unknown }).type;
  if (typeof t !== 'string') return false;
  const scope = (obj as { scope?: unknown }).scope;
  if (scope !== 'question' && scope !== 'global') return false;
  const key = findSchemaKeyByType(defs, t, scope);
  return !!key;
};
