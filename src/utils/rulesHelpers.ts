import rulesSchema from '../schemas/rules.json';

// Get the full definitions bundle from rules.json (supports both {definitions} and flat)
export const getRuleDefinitions = (): Record<string, any> => {
  const defs: any = (rulesSchema as any)?.definitions ?? (rulesSchema as any);
  return defs || {};
};

// Dynamic friendly name from schema key (no hardcoding)
export const friendlyRuleLabel = (key: string): string => {
  let name = key.replace(/(QuestionRule|MultiQuestionRule|Rule)$/, '');
  name = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return name;
};

// Resolve a rule schema key by type const and optional question_id requirement
export const findSchemaKeyByType = (
  defs: Record<string, any>,
  type: string,
  requireQuestionId?: boolean
): string | null => {
  for (const k of Object.keys(defs)) {
    const props = defs[k]?.properties ?? {};
    const typeConst = props?.type?.const;
    const hasQid = !!props?.question_id;
    if (typeConst === type && (requireQuestionId === undefined || requireQuestionId === hasQid)) return k;
  }
  return null;
};

// Check if a schema key represents a single-target rule (has question_id)
export const isSingleTargetKey = (defs: Record<string, any>, key: string): boolean =>
  !!defs[key]?.properties?.question_id;

// Heuristics: object is a rule when it has a string "type" and matches a known rule schema
export const isRuleObject = (obj: any, defs: Record<string, any>): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj.type;
  if (typeof t !== 'string') return false;
  const key = findSchemaKeyByType(defs, t, !!obj?.question_id);
  return !!key;
};

// Pretty key labels when schema titles are missing
export const prettifyKey = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());