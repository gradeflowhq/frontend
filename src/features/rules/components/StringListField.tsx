import { MultiSelect, TagsInput } from '@mantine/core';
import React from 'react';

import {
  GRADEFLOW_KEY,
  GRADEFLOW_SUGGESTIONS_KEY,
} from '../schemaHints';

import type { FieldProps } from '@rjsf/utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (typeof item === 'number') return [String(item)];
    return [];
  });
};

const enumValues = (schema: FieldProps['schema']): string[] => {
  const items = schema.items;
  return isRecord(items) ? stringList(items.enum) : [];
};

const suggestions = (schema: FieldProps['schema']): string[] => {
  const metadata = (schema as Record<string, unknown>)[GRADEFLOW_KEY];
  return isRecord(metadata) ? stringList(metadata[GRADEFLOW_SUGGESTIONS_KEY]) : [];
};

const StringListField: React.FC<FieldProps> = (props) => {
  const options = enumValues(props.schema);
  const commonProps = {
    id: props.idSchema?.$id ?? props.id,
    label: props.uiSchema?.['ui:title'] ?? props.schema.title ?? props.name,
    description: props.schema.description,
    value: stringList(props.formData),
    onChange: (next: string[]) => props.onChange(next, props.fieldPathId.path),
    disabled: props.disabled,
    readOnly: props.readonly,
    error: props.rawErrors?.join('\n'),
    clearable: true,
    withAsterisk: props.required,
  };

  if (options.length > 0) {
    return <MultiSelect {...commonProps} data={options} searchable />;
  }

  return <TagsInput {...commonProps} data={suggestions(props.schema)} splitChars={[',', '\n']} />;
};

export default StringListField;
