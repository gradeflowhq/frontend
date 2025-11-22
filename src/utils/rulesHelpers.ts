import rulesSchema from '../schemas/rules.json';
import { MAX_RULE_UISCHEMA_DEPTH } from './rulesConstants';

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

// Build nested uiSchema to hide fields (without modifying the JSON schema)
// Applies hidden widgets at current level and recurses into arrays of rule-like objects up to MAX_RULE_UISCHEMA_DEPTH
export const buildUiSchema = (
  schema: any,
  hiddenKeys: string[],
  depth = 0,
  defs: Record<string, any> = {}
): Record<string, any> => {
  if (!schema || typeof schema !== 'object' || depth > MAX_RULE_UISCHEMA_DEPTH) return {};

  const ui: Record<string, any> = {};

  const props = schema.properties ?? {};
  hiddenKeys.forEach((k) => {
    if (props && props[k] !== undefined) {
      ui[k] = { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } };
    }
  });

  for (const [k, propSchema] of Object.entries<any>(props)) {
    if (!propSchema) continue;

    let resolvedProp = propSchema;
    if (propSchema.$ref && typeof propSchema.$ref === 'string') {
      const refKey = propSchema.$ref.replace(/^#\/definitions\//, '');
      if (defs[refKey]) resolvedProp = defs[refKey];
    }

    if (resolvedProp.type === 'object' && resolvedProp.properties) {
      ui[k] = { ...(ui[k] ?? {}), ...buildUiSchema(resolvedProp, hiddenKeys, depth + 1, defs) };
      continue;
    }

    if (resolvedProp.type === 'array' && resolvedProp.items) {
      const itemsSchema = resolvedProp.items;
      ui[k] = ui[k] ?? {};
      ui[k].items = ui[k].items ?? {};

      // Helper to resolve refs and merge properties
      const resolveAndMerge = (schemas: any[]) => {
        const mergedProps: Record<string, any> = {};
        schemas.forEach((s) => {
          let target = s;
          if (s.$ref && typeof s.$ref === 'string') {
            const refKey = s.$ref.replace(/^#\/definitions\//, '');
            if (defs[refKey]) target = defs[refKey];
          }
          if (target.properties) {
            Object.assign(mergedProps, target.properties);
          }
        });
        return mergedProps;
      };

      if (Array.isArray(itemsSchema.oneOf)) {
        hiddenKeys.forEach((hk) => {
          ui[k].items[hk] = { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } };
        });

        const mergedProps = resolveAndMerge(itemsSchema.oneOf);
        Object.assign(ui[k].items, buildUiSchema({ properties: mergedProps }, hiddenKeys, depth + 1, defs));

      } else if (Array.isArray(itemsSchema.anyOf)) {
        hiddenKeys.forEach((hk) => {
          ui[k].items[hk] = { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } };
        });

        const mergedProps = resolveAndMerge(itemsSchema.anyOf);
        Object.assign(ui[k].items, buildUiSchema({ properties: mergedProps }, hiddenKeys, depth + 1, defs));

      } else if (typeof itemsSchema === 'object') {
        ui[k].items = { ...ui[k].items, ...buildUiSchema(itemsSchema, hiddenKeys, depth + 1, defs) };
      }
    }
  }

  return ui;
};

// Pretty key labels when schema titles are missing
export const prettifyKey = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());