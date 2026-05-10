import { Group, MultiSelect, TagsInput, Text } from '@mantine/core';
import React from 'react';

import {
  GRADEFLOW_KEY,
  GRADEFLOW_SUGGESTIONS_KEY,
} from '../schemaHints';

import type { FieldProps } from '@rjsf/utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type SuggestionOption = { value: string; count: number };

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

const compareSuggestionValues = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const compareSuggestions = (a: SuggestionOption, b: SuggestionOption): number =>
  b.count - a.count || compareSuggestionValues(a.value, b.value);

const suggestions = (schema: FieldProps['schema']): SuggestionOption[] => {
  const metadata = (schema as Record<string, unknown>)[GRADEFLOW_KEY];
  if (!isRecord(metadata)) return [];

  const suggestionCounts = metadata[GRADEFLOW_SUGGESTIONS_KEY];
  if (!isRecord(suggestionCounts)) return [];

  return Object.entries(suggestionCounts)
    .flatMap(([value, count]) => (
      typeof count === 'number' && Number.isFinite(count) && count > 0
        ? [{ value, count }]
        : []
    ))
    .sort(compareSuggestions);
};

const StringListField: React.FC<FieldProps> = (props) => {
  const options = enumValues(props.schema);
  const suggestionOptions = suggestions(props.schema);
  const suggestionCounts = new Map(
    suggestionOptions.map((option) => [option.value, option.count]),
  );
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

  return (
    <TagsInput
      {...commonProps}
      data={suggestionOptions.map((option) => option.value)}
      splitChars={[',', '\n']}
      renderOption={({ option }) => (
        <Group gap="sm" justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
          <Text span truncate style={{ minWidth: 0, flex: 1 }}>
            {option.value}
          </Text>
          <Text span c="dimmed" size="xs" fw={600}>
            {suggestionCounts.get(String(option.value))}
          </Text>
        </Group>
      )}
    />
  );
};

export default StringListField;
