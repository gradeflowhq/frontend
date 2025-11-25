import rulesSchema from '@schemas/rules.json';

export const getRuleDefinitions = (): Record<string, any> => {
  const defs: any = (rulesSchema as any)?.definitions ?? (rulesSchema as any);
  return defs || {};
};

export const friendlyRuleLabel = (key: string): string => {
  let name = key.replace(/(QuestionRule|MultiQuestionRule|Rule)$/, '');
  name = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return name;
};

export const prettifyKey = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const findSchemaKeyByType = (
  defs: Record<string, any>,
  type: string,
  requireQuestionId?: boolean
): string | null => {
  for (const k of Object.keys(defs)) {
    const props = defs[k]?.properties ?? {};
    const typeConst = props?.type?.const ?? props?.type?.default;
    const hasQid = !!props?.question_id;
    if (typeConst === type && (requireQuestionId === undefined || requireQuestionId === hasQid)) {
      return k;
    }
  }
  return null;
};

export const isRuleObject = (obj: unknown, defs: Record<string, any>): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  const t = (obj as any).type;
  if (typeof t !== 'string') return false;
  const key = findSchemaKeyByType(defs, t, !!(obj as any)?.question_id);
  return !!key;
};