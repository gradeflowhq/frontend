import React from 'react';
import Modal from '@components/common/Modal';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import requestsSchema from '@schemas/requests.json';
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
    <Modal open={!!openItem} onClose={onClose}>
      <h3 className="font-bold text-lg">Edit Assessment</h3>

      {openItem && (
        <SchemaForm<AssessmentUpdateRequest>
          schema={schema}
          uiSchema={uiSchema}
          formData={{ name: openItem.name, description: openItem.description }}
          showSubmit={false}
          onSubmit={async ({ formData }) => {
            if (!formData) return;
            await onSubmit(openItem.id, formData);
          }}
          formProps={{ noHtml5Validate: true, id: formId }}
        />
      )}

      {!!error && <ErrorAlert error={error} className="mt-2" />}

      <div className="modal-action">
        <Button type="button" variant='ghost' onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <LoadingButton
          type="submit"
          form={formId}
          variant="primary"
          isLoading={isSubmitting}
          loadingLabel="Saving..."
          idleLabel="Save"
          disabled={!openItem}
        />
      </div>
    </Modal>
  );
};

export default AssessmentEditModal;