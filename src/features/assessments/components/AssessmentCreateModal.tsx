import React from 'react';
import Modal from '@components/common/Modal';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import requestsSchema from '@schemas/requests.json';
import type { AssessmentCreateRequest } from '@api/models';

type Props = {
  open: boolean;
  isSubmitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (data: AssessmentCreateRequest) => Promise<void> | void;
};

const getCreateSchema = () => {
  const schema = (requestsSchema as any)['AssessmentCreateRequest'];
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
    <Modal open={open} onClose={onClose}>
      <h3 className="font-bold text-lg">Create Assessment</h3>

      <SchemaForm<AssessmentCreateRequest>
        schema={schema}
        uiSchema={uiSchema}
        showSubmit={false}
        onSubmit={async ({ formData }) => {
          if (!formData) return;
          await onSubmit(formData);
        }}
        formProps={{ noHtml5Validate: true, id: formId }}
      />

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
          loadingLabel="Creating..."
          idleLabel="Create"
        />
      </div>
    </Modal>
  );
};

export default AssessmentCreateModal;