import {
  CODE_INPUT,
  GRADEFLOW_INPUT_KEY,
  GRADEFLOW_KEY,
  RULE_INPUT,
  RULE_LIST_INPUT,
  STRING_LIST_INPUT,
} from './schemaHints';

import type { JSONSchema7 } from 'json-schema';

export type UiSchema = Record<string, unknown>;

const CODE_WIDGET_OPTIONS = { language: 'python', height: '320px' };
const FIXED_RULE_LIST_OPTIONS = { addable: false, orderable: false, removable: false };
const HIDDEN_FIELD_UI = {
  'ui:widget': 'hidden',
  'ui:title': '',
  'ui:options': { label: false, hidden: true },
};
const RULE_SLOT_UI = {
  'ui:field': 'RuleSlotField',
  'ui:fieldReplacesAnyOrOneOf': true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const gradeflowInput = (node: Record<string, unknown>): unknown => {
  const metadata = node[GRADEFLOW_KEY];
  return isRecord(metadata) ? metadata[GRADEFLOW_INPUT_KEY] : undefined;
};

const resolveRef = (
  node: Record<string, unknown>,
  root: Record<string, unknown>,
): Record<string, unknown> => {
  const ref = node.$ref;
  if (typeof ref !== 'string' || !ref.startsWith('#/$defs/')) return node;

  const defs = root.$defs;
  if (!isRecord(defs)) return node;

  const resolved = defs[ref.replace('#/$defs/', '')];
  return isRecord(resolved) ? resolved : node;
};

const isFixedLengthArray = (node: Record<string, unknown>): boolean =>
  node.type === 'array'
  && typeof node.minItems === 'number'
  && typeof node.maxItems === 'number'
  && node.minItems === node.maxItems;

const unionOptions = (node: Record<string, unknown>): unknown[] => {
  if (Array.isArray(node.oneOf)) return node.oneOf;
  if (Array.isArray(node.anyOf)) return node.anyOf;
  return [];
};

const arrayItemTitle = (
  items: Record<string, unknown>,
  root: Record<string, unknown>,
): string | null => {
  const title = resolveRef(items, root).title;
  return typeof title === 'string' ? title : null;
};

const withNumberedItemTitle = (uiSchema: UiSchema, title: string): UiSchema['items'] =>
  (_item: unknown, index: number) => ({
    ...uiSchema,
    'ui:title': `${title} ${index + 1}`,
  });

const mergeMissing = (target: UiSchema, source: UiSchema): void => {
  Object.entries(source).forEach(([key, value]) => {
    const current = target[key];
    if (isRecord(current) && isRecord(value)) {
      mergeMissing(current, value);
      return;
    }
    if (!(key in target)) target[key] = value;
  });
};

const uiSchemaForNode = (
  node: unknown,
  root: Record<string, unknown>,
  seen: WeakSet<Record<string, unknown>> = new WeakSet(),
): UiSchema => {
  if (!isRecord(node)) return {};
  const resolved = resolveRef(node, root);
  if (seen.has(resolved)) return {};
  seen.add(resolved);

  const uiSchema: UiSchema = {};

  try {
    const properties = resolved.properties;

    if (isRecord(properties)) {
      Object.entries(properties).forEach(([name, child]) => {
        const childUi = uiSchemaForProperty(child, root, seen);
        if (Object.keys(childUi).length > 0) uiSchema[name] = childUi;
      });
    }

    unionOptions(resolved).forEach((option) => {
      mergeMissing(uiSchema, uiSchemaForNode(option, root, seen));
    });

    return uiSchema;
  } finally {
    seen.delete(resolved);
  }
};

const uiSchemaForProperty = (
  node: unknown,
  root: Record<string, unknown>,
  seen: WeakSet<Record<string, unknown>>,
): UiSchema => {
  if (!isRecord(node)) return {};
  const resolved = resolveRef(node, root);
  const uiSchema: UiSchema = {};

  if (resolved.readOnly === true) {
    Object.assign(uiSchema, HIDDEN_FIELD_UI);
  }

  const input = gradeflowInput(resolved);
  if (input === CODE_INPUT) {
    uiSchema['ui:widget'] = 'CodeEditorWidget';
    uiSchema['ui:options'] = { ...CODE_WIDGET_OPTIONS };
  }

  if (input === STRING_LIST_INPUT) {
    uiSchema['ui:field'] = 'StringListField';
  }

  if (input === RULE_INPUT) {
    Object.assign(uiSchema, RULE_SLOT_UI);
  }

  if (input === RULE_LIST_INPUT) {
    uiSchema.items = { ...RULE_SLOT_UI };
    if (isFixedLengthArray(resolved)) {
      uiSchema['ui:options'] = { ...FIXED_RULE_LIST_OPTIONS };
    }
  } else if (isRecord(resolved.items)) {
    const itemUi = uiSchemaForNode(resolved.items, root, seen);
    const itemTitle = arrayItemTitle(resolved.items, root);
    if (itemTitle) {
      uiSchema.items = withNumberedItemTitle(itemUi, itemTitle);
    } else if (Object.keys(itemUi).length > 0) {
      uiSchema.items = itemUi;
    }
  }

  if (isRecord(resolved.additionalProperties)) {
    const additionalUi = uiSchemaForNode(resolved.additionalProperties, root, seen);
    if (Object.keys(additionalUi).length > 0) {
      uiSchema.additionalProperties = additionalUi;
    }
  }

  const childUi = uiSchemaForNode(resolved, root, seen);
  mergeMissing(uiSchema, childUi);

  return uiSchema;
};

export const buildRuleUiSchema = (
  schema: JSONSchema7,
): UiSchema => uiSchemaForNode(schema, schema as Record<string, unknown>);
