import { Modal, Alert, Button, Group } from '@mantine/core';
import React from 'react';

import { SchemaForm } from '@components/forms/SchemaForm';
import requestsSchema from '@schemas/requests.json';
import { getErrorMessage } from '@utils/error';

import type { AssessmentCreateRequest } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

type Props = {
  open: boolean;
  isSubmitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (data: AssessmentCreateRequest) => Promise<void> | void;
};

const getCreateSchema = (): JSONSchema7 => {
  const schema = (requestsSchema as Record<string, JSONSchema7>)['AssessmentCreateRequest'];
  if (!schema) throw new Error('AssessmentCreateRequest schema not found in requests.json');
  return schema;
};

const uiSchema = {
  'ui:title': '',
  'ui:options': { label: true },
  'ui:submitButtonOptions': { norender: true },
  name: { 'ui:options': { inputType: 'text' } },
  description: { 'ui:options': { inputType: 'text' } },
};

const AssessmentCreateModal: React.FC<Props> = ({ open, isSubmitting, error, onClose, onSubmit }) => {
  if (!open) return null;
  const schema = getCreateSchema();
  const formId = 'assessment-create-form';

  return (
    <Modal opened={open} onClose={onClose} title="Create Assessment" size="md">
      <SchemaForm<AssessmentCreateRequest>
        schema={schema}
        uiSchema={uiSchema}
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
        <Button type="submit" form={formId} loading={isSubmitting}>Create</Button>
      </Group>
    </Modal>
  );
};

export default AssessmentCreateModal;
