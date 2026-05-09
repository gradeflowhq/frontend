import { Alert, Box, Button, Group, Skeleton, Stack } from '@mantine/core';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import React from 'react';

import HiddenAwareFieldTemplate from '@components/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/forms/SchemaForm';
import CodeEditorWidget from '@components/forms/widgets/CodeEditorWidget';
import { getErrorMessage } from '@utils/error';

import RuleSlotField from './RuleSlotField';
import StringListField from './StringListField';

import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

type RuleFormContext = {
  assessmentId: string;
  questionId?: string | null;
};

interface RuleEditorFormProps {
  formKey: string;
  schema: JSONSchema7 | null;
  uiSchema: Record<string, unknown>;
  draft: RuleValue;
  formContext: RuleFormContext;
  onDraftChange: (next: RuleValue) => void;
  onSave: (rule: RuleValue) => void;
  onCancel: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
  error?: unknown;
}

const templates = { FieldTemplate: HiddenAwareFieldTemplate };
const widgets = { CodeEditorWidget };
const fields = { RuleSlotField, StringListField };
const formProps = {
  noHtml5Validate: true,
  noValidate: true,
};

const RuleEditorForm: React.FC<RuleEditorFormProps> = ({
  formKey,
  schema,
  uiSchema,
  draft,
  formContext,
  onDraftChange,
  onSave,
  onCancel,
  isSaving,
  isLoading,
  error,
}) => {
  const handleChange = React.useCallback(
    ({ formData }: { formData?: RuleValue }) => {
      if (formData !== undefined) onDraftChange(formData);
    },
    [onDraftChange],
  );

  const handleSaveClick = React.useCallback(() => {
    onSave(draft);
  }, [draft, onSave]);

  if (!schema) {
    if (isLoading) {
      return (
        <Stack gap="sm">
          <Skeleton height={36} />
          <Skeleton height={88} />
          <Skeleton height={36} width="40%" ml="auto" />
        </Stack>
      );
    }
    return <Alert color="yellow">Rule schema not found.</Alert>;
  }

  return (
    <Box>
      <SchemaForm<RuleValue>
        key={formKey}
        schema={schema}
        uiSchema={uiSchema}
        formData={draft}
        onChange={handleChange}
        formProps={formProps}
        showSubmit={false}
        templates={templates}
        widgets={widgets}
        fields={fields}
        formContext={formContext}
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
          onClick={handleSaveClick}
        >
          Save
        </Button>
      </Group>
    </Box>
  );
};

export default RuleEditorForm;
