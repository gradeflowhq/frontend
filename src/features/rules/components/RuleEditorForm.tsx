import { Alert, Box, Button, Group } from '@mantine/core';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import React from 'react';

import HiddenAwareFieldTemplate from '@components/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/forms/SchemaForm';
import SwitchableTextWidget from '@components/forms/widgets/SwitchableTextWidget';
import { getErrorMessage } from '@utils/error';

import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

type JsonObject = Record<string, unknown>;
type SplitSection = {
  key: string;
  schema: JSONSchema7;
  kind: 'full' | 'base' | 'branch';
};
type SplitPlan = {
  sections: SplitSection[];
};

interface RuleEditorFormProps {
  /** Unique key — forces SchemaForm remount when rule/question changes. */
  formKey: string;
  schemaForRender: JSONSchema7 | null;
  mergedUiSchema: Record<string, unknown>;
  hiddenKeys: readonly string[];
  draft: RuleValue;
  onDraftChange: (next: RuleValue) => void;
  onSave: (rule: RuleValue) => void;
  onCancel: () => void;
  isSaving?: boolean;
  error?: unknown;
}

// Module-level constants give SchemaForm stable references across re-renders.
const templates = { FieldTemplate: HiddenAwareFieldTemplate };
const widgets = { TextWidget: SwitchableTextWidget };

const asObject = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const getSchemaProperties = (schema: JSONSchema7): Record<string, JSONSchema7> =>
  asObject(schema.properties) as Record<string, JSONSchema7>;

const getRequiredKeys = (schema: JSONSchema7): string[] =>
  Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === 'string')
    : [];

const isComplexBranchSchema = (schema: JSONSchema7 | undefined): boolean => {
  if (!schema || typeof schema !== 'object') return false;
  const schemaType = schema.type;
  return (
    schemaType === 'array' ||
    schemaType === 'object' ||
    !!schema.properties ||
    Array.isArray(schema.oneOf) ||
    Array.isArray(schema.anyOf) ||
    Array.isArray(schema.allOf)
  );
};

const buildPartialSchema = (
  schema: JSONSchema7,
  keys: string[],
): JSONSchema7 | null => {
  if (keys.length === 0) return null;
  const properties = getSchemaProperties(schema);
  const required = getRequiredKeys(schema).filter((key) => keys.includes(key));
  return {
    ...schema,
    title: '',
    properties: Object.fromEntries(
      keys
        .filter((key) => properties[key])
        .map((key) => [key, properties[key]]),
    ),
    required,
  };
};

const buildSplitPlan = (
  schema: JSONSchema7,
  hiddenKeys: readonly string[],
): SplitPlan => {
  const properties = getSchemaProperties(schema);
  const hidden = new Set(hiddenKeys);
  const keys = Object.keys(properties);
  const hasBranch = keys.some(
    (key) => !hidden.has(key) && isComplexBranchSchema(properties[key]),
  );

  if (!hasBranch) {
    return { sections: [{ key: 'full', schema, kind: 'full' }] };
  }

  const sections: SplitSection[] = [];
  let baseKeys: string[] = [];

  const flushBase = () => {
    const partialSchema = buildPartialSchema(schema, baseKeys);
    if (partialSchema) {
      sections.push({
        key: `base:${sections.length}:${baseKeys.join(',')}`,
        schema: partialSchema,
        kind: 'base',
      });
    }
    baseKeys = [];
  };

  keys.forEach((key) => {
    if (hidden.has(key)) return;
    if (isComplexBranchSchema(properties[key])) {
      flushBase();
      const branchSchema = buildPartialSchema(schema, [key]);
      if (branchSchema) sections.push({ key, schema: branchSchema, kind: 'branch' });
      return;
    }
    baseKeys.push(key);
  });

  flushBase();

  return { sections };
};

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({
  formKey,
  schemaForRender,
  mergedUiSchema,
  hiddenKeys,
  draft,
  onDraftChange,
  onSave,
  onCancel,
  isSaving,
  error,
}) => {
  const latestDraftRef = React.useRef(draft);

  React.useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  const formContext = React.useMemo(
    () => ({ hideKeys: new Set(hiddenKeys) }),
    [hiddenKeys],
  );

  const formProps = React.useMemo(
    () => ({
      noHtml5Validate: true,
      noValidate: true,
      experimental_componentUpdateStrategy: 'shallow' as const,
    }),
    [],
  );

  const handleChange = React.useCallback(
    ({ formData }: { formData?: RuleValue }) => {
      const next = (formData ?? latestDraftRef.current) as RuleValue;
      latestDraftRef.current = next;
      onDraftChange(next);
    },
    [onDraftChange],
  );

  const handleSubmit = React.useCallback(
    ({ formData }: { formData?: RuleValue }) => {
      if (!formData) return;
      latestDraftRef.current = formData;
      onSave(formData as RuleValue);
    },
    [onSave],
  );

  const handleSaveClick = React.useCallback(() => {
    onSave(latestDraftRef.current);
  }, [onSave]);

  const handlePartialChange = React.useCallback(
    ({ formData }: { formData?: JsonObject }) => {
      const next = {
        ...asObject(latestDraftRef.current),
        ...asObject(formData),
      } as unknown as RuleValue;
      latestDraftRef.current = next;
      onDraftChange(next);
    },
    [onDraftChange],
  );

  const splitPlan = React.useMemo(
    () => (schemaForRender ? buildSplitPlan(schemaForRender, hiddenKeys) : null),
    [hiddenKeys, schemaForRender],
  );

  const branchFormData = React.useMemo(() => {
    if (!splitPlan) return {};
    return Object.fromEntries(
      splitPlan.sections.filter((section) => section.kind === 'branch').map(({ key }) => [
        key,
        { [key]: asObject(draft)[key] },
      ]),
    ) as Record<string, JsonObject>;
  }, [draft, splitPlan]);

  if (!schemaForRender || !splitPlan) {
    return <Alert color="yellow">Rule schema not found.</Alert>;
  }

  return (
    <Box>
      {splitPlan.sections.map((section) =>
        section.kind === 'full' ? (
          <SchemaForm<RuleValue>
            key={`${formKey}:${section.kind}:${section.key}`}
            schema={section.schema}
            uiSchema={mergedUiSchema}
            formData={draft}
            onChange={handleChange}
            onSubmit={handleSubmit}
            formProps={formProps}
            showSubmit={false}
            templates={templates}
            widgets={widgets}
            formContext={formContext}
          />
        ) : (
          <SchemaForm<JsonObject>
            key={`${formKey}:${section.kind}:${section.key}`}
            schema={section.schema}
            uiSchema={mergedUiSchema}
            formData={
              section.kind === 'branch'
                ? branchFormData[section.key]
                : (draft as unknown as JsonObject)
            }
            onChange={handlePartialChange}
            formProps={formProps}
            showSubmit={false}
            templates={templates}
            widgets={widgets}
            formContext={formContext}
          />
        ),
      )}

      {!!error && (
        <Alert color="red" mt="sm">
          {getErrorMessage(error)}
        </Alert>
      )}

      <Group justify="flex-end" gap="sm" mt="md">
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconX size={14} />}
          onClick={onCancel}
          disabled={!!isSaving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          leftSection={<IconDeviceFloppy size={14} />}
          loading={!!isSaving}
          onClick={handleSaveClick}
        >
          Save
        </Button>
      </Group>
    </Box>
  );
};

export default RuleEditorForm;
