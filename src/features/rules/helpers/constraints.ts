import type { QuestionSetOutputQuestionMap, QuestionConstraint, RubricOutputRulesItem, RubricInputRulesItem } from '@api/models';

type RuleDraft = RubricOutputRulesItem | RubricInputRulesItem | Record<string, unknown>;
type JsonSchema = Record<string, any>;
type UiSchema = Record<string, any>;

const toStrings = (val: unknown): string[] =>
  val == null ? [] : Array.isArray(val) ? val.map(String) : [String(val)];


const collectConstraintOptions = (qMap: QuestionSetOutputQuestionMap, constraint: QuestionConstraint, scopedQid?: string | null): string[] => {
  if (scopedQid && qMap[scopedQid]) {
    const def = qMap[scopedQid] as any;
    if (String(def?.type ?? '') !== String(constraint.type)) return [];
    return toStrings(def?.[constraint.source]);
  }
  const m = /^([^.\s]+)\.(.+)$/.exec(constraint.source ?? '');
  if (m) {
    const [, qid, attr] = m;
    const def = qMap[qid] as any;
    if (!def) return [];
    if (String(def?.type ?? '') !== String(constraint.type)) return [];
    return toStrings(def?.[attr]);
  }
  return [];
};

const injectIntoProps = (props: any, target: string, options: string[]): boolean => {
  if (!props || !props[target] || options.length === 0) return false;
  const prop = props[target];
  if (!prop.type || prop.type === 'string') {
    props[target] = { ...(prop ?? { type: 'string' }), enum: options };
    return true;
  }
  if (prop.type === 'array') {
    const items = prop.items ?? { type: 'string' };
    props[target] = { ...prop, items: { ...items, type: items.type ?? 'string', enum: options } };
    return true;
  }
  return false;
};

const buildSelectUiForTarget = (props: any, target: string): UiSchema => {
  const ui: UiSchema = {};
  const prop = props?.[target];
  if (!prop) return ui;
  ui[target] = prop.type === 'array'
    ? { 'ui:widget': 'select', 'ui:options': { multiple: true } }
    : { 'ui:widget': 'select' };
  return ui;
};

export const enrichSchemaByConstraints = (
  baseSchema: JsonSchema,
  defs: Record<string, any>,
  draft: RuleDraft,
  qMap: QuestionSetOutputQuestionMap,
  scopedQid?: string | null
): { schema: JsonSchema; definitions: Record<string, any>; uiSchema: UiSchema } => {
  const schema: JsonSchema = JSON.parse(JSON.stringify(baseSchema));
  const definitions: Record<string, any> = JSON.parse(JSON.stringify(defs));
  const uiSchema: UiSchema = {};

  const constraints: QuestionConstraint[] = Array.isArray((draft as any)?.constraints)
    ? ((draft as any).constraints as QuestionConstraint[])
    : [];

  const applyToSchemaObject = (obj: any, c: QuestionConstraint) => {
    const opts = collectConstraintOptions(qMap, c, scopedQid);
    if (!c.target || opts.length === 0) return;
    const ok = injectIntoProps(obj.properties, c.target, opts);
    if (ok) Object.assign(uiSchema, buildSelectUiForTarget(obj.properties, c.target));
  };

  const branches = Array.isArray(schema.oneOf) ? schema.oneOf : Array.isArray(schema.anyOf) ? schema.anyOf : null;

  constraints.forEach((c) => {
    if (branches) {
      const t = (draft as any)?.type;
      const candidates = branches.filter((b: any) => {
        const constType = b?.properties?.type?.const ?? b?.properties?.type?.default;
        return t && constType ? String(constType) === String(t) : !!b?.properties?.[c.target];
      });
      candidates.forEach((branch: any) => applyToSchemaObject(branch, c));
    } else {
      applyToSchemaObject(schema, c);
    }
  });

  return { schema, definitions, uiSchema };
};