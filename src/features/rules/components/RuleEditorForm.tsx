import { Alert, Box, Button, Group } from '@mantine/core';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import React from 'react';

import HiddenAwareFieldTemplate from '@components/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/forms/SchemaForm';
import SwitchableTextWidget from '@components/forms/widgets/SwitchableTextWidget';
import { getErrorMessage } from '@utils/error';

import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

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
  if (!schemaForRender) {
    return <Alert color="yellow">Rule schema not found.</Alert>;
  }

  return (
    <Box>
      <SchemaForm<RuleValue>
        key={formKey}
        schema={schemaForRender}
        uiSchema={mergedUiSchema}
        formData={draft}
        onChange={({ formData }) =>
          onDraftChange((formData ?? draft) as RuleValue)
        }
        onSubmit={({ formData }) => {
          if (formData) onSave(formData as RuleValue);
        }}
        formProps={{ noHtml5Validate: true }}
        showSubmit={false}
        templates={templates}
        widgets={widgets}
        formContext={{ hideKeys: new Set(hiddenKeys) }}
      />

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
          onClick={() => onSave(draft)}
        >
          Save
        </Button>
      </Group>
    </Box>
  );
};

export default RuleEditorForm;