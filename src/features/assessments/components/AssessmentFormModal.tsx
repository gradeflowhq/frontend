import { Modal, Alert, Button, Group } from '@mantine/core';
import React from 'react';

import { SchemaForm } from '@components/forms/SchemaForm';
import requestsSchema from '@schemas/requests.json';
import { getErrorMessage } from '@utils/error';

import { assessmentFormUiSchema } from '../constants';

import type { AssessmentCreateRequest, AssessmentUpdateRequest } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

type AssessmentFormData = AssessmentCreateRequest | AssessmentUpdateRequest;

type Props = {
  mode: 'create' | 'edit';
  opened: boolean;
  initialData?: Pick<AssessmentUpdateRequest, 'name' | 'description'>;
  isSubmitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (data: AssessmentFormData) => Promise<void> | void;
};

const getSchema = (mode: 'create' | 'edit'): JSONSchema7 => {
  const key = mode === 'create' ? 'AssessmentCreateRequest' : 'AssessmentUpdateRequest';
  const schema = (requestsSchema as Record<string, JSONSchema7>)[key];
  if (!schema) throw new Error(`${key} schema not found in requests.json`);
  return schema;
};

const AssessmentFormModal: React.FC<Props> = ({
  mode,
  opened,
  initialData,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}) => {
  const schema = getSchema(mode);
  const formId = `assessment-${mode}-form`;
  const title = mode === 'create' ? 'Create Assessment' : 'Edit Assessment';
  const submitLabel = mode === 'create' ? 'Create' : 'Save';

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <SchemaForm<AssessmentFormData>
        schema={schema}
        uiSchema={assessmentFormUiSchema}
        formData={initialData}
        showSubmit={false}
        onSubmit={({ formData }) => {
          if (!formData) return;
          void onSubmit(formData);
        }}
        formProps={{ noHtml5Validate: true, id: formId }}
      />

      {!!error && (
        <Alert color="red" mt="md">{getErrorMessage(error)}</Alert>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" form={formId} loading={isSubmitting}>{submitLabel}</Button>
      </Group>
    </Modal>
  );
};

export default AssessmentFormModal;
