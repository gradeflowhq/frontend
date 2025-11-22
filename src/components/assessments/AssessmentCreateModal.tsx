import React from 'react';
import Modal from '../common/Modal';
import { SchemaForm } from '../common/SchemaForm';
import ErrorAlert from '../common/ErrorAlert';
import requestsSchema from '../../schemas/requests.json';
import type { AssessmentCreateRequest } from '../../api/models';

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
  name: { 'ui:options': { inputType: 'text' } },
  description: { 'ui:options': { inputType: 'text' } },
};

const AssessmentCreateModal: React.FC<Props> = ({ open, isSubmitting, error, onClose, onSubmit }) => {
  if (!open) return null;
  const schema = getCreateSchema();

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="font-bold text-lg">Create Assessment</h3>
      <SchemaForm<AssessmentCreateRequest>
        schema={schema}
        uiSchema={uiSchema}
        onSubmit={async ({ formData }) => {
          await onSubmit(formData);
        }}
        formProps={{ noHtml5Validate: true }}
      />
      {error && <ErrorAlert error={error} className="mt-2" />}
      <div className="modal-action">
        <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>
          Close
        </button>
      </div>
    </Modal>
  );
};

export default AssessmentCreateModal;