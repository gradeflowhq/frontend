import { Modal, Alert, Button, Group } from '@mantine/core';
import React from 'react';

import { SchemaForm } from '@components/common/forms/SchemaForm';
import requestsSchema from '@schemas/requests.json';
import { getErrorMessages } from '@utils/error';

import type { AssessmentUpdateRequest, AssessmentResponse } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

type Props = {
  openItem: AssessmentResponse | null;
  isSubmitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (id: string, data: AssessmentUpdateRequest) => Promise<void> | void;
};

const getUpdateSchema = (): JSONSchema7 => {
  const schema = (requestsSchema as Record<string, JSONSchema7>)['AssessmentUpdateRequest'];
  if (!schema) throw new Error('AssessmentUpdateRequest schema not found in requests.json');
  return schema;
};

const uiSchema = {
  'ui:title': '',
  'ui:options': { label: true },
  'ui:submitButtonOptions': { norender: true },
  name: { 'ui:options': { inputType: 'text' } },
  description: { 'ui:options': { inputType: 'text' } },
};

const AssessmentEditModal: React.FC<Props> = ({ openItem, isSubmitting, error, onClose, onSubmit }) => {
  const schema = getUpdateSchema();
  const formId = 'assessment-edit-form';

  return (
    <Modal opened={!!openItem} onClose={onClose} title="Edit Assessment" size="md">
      {openItem && (
        <SchemaForm<AssessmentUpdateRequest>
          schema={schema}
          uiSchema={uiSchema}
          formData={{ name: openItem.name, description: openItem.description }}
          showSubmit={false}
          onSubmit={({ formData }) => {
            if (!formData) return;
            void onSubmit(openItem.id, formData);
          }}
          formProps={{ noHtml5Validate: true, id: formId }}
        />
      )}

      {!!error && (
        <Alert color="red" mt="md">{getErrorMessages(error).join(' ')}</Alert>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" form={formId} loading={isSubmitting} disabled={!openItem}>Save</Button>
      </Group>
    </Modal>
  );
};

export default AssessmentEditModal;
