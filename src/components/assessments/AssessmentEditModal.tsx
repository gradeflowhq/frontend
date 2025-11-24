import React from 'react';
import { IconEdit } from '../ui/icons';
import Modal from '../common/Modal';
import { SchemaForm } from '../common/forms/SchemaForm';
import ErrorAlert from '../common/ErrorAlert';
import { Button } from '../ui/Button';
import requestsSchema from '../../schemas/requests.json';
import type { AssessmentUpdateRequest, AssessmentResponse } from '../../api/models';

type Props = {
  openItem: AssessmentResponse | null;
  isSubmitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (id: string, data: AssessmentUpdateRequest) => Promise<void> | void;
};

const getUpdateSchema = () => {
  const schema = (requestsSchema as any)['AssessmentUpdateRequest'];
  if (!schema) throw new Error('AssessmentUpdateRequest schema not found in requests.json');
  return schema;
};

const uiSchema = {
  'ui:title': '',
  'ui:options': { label: true },
  name: { 'ui:options': { inputType: 'text' } },
  description: { 'ui:options': { inputType: 'text' } },
};

const AssessmentEditModal: React.FC<Props> = ({ openItem, isSubmitting, error, onClose, onSubmit }) => {
  const schema = getUpdateSchema();

  return (
    <Modal open={!!openItem} onClose={onClose}>
      <h3 className="font-bold text-lg flex items-center gap-2">Edit Assessment</h3>
      {openItem && (
        <SchemaForm<AssessmentUpdateRequest>
          schema={schema}
          uiSchema={uiSchema}
          formData={{
            name: openItem.name,
            description: openItem.description,
          }}
          onSubmit={async ({ formData }) => {
            await onSubmit(openItem.id, formData);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}
      {error && <ErrorAlert error={error} className="mt-2" />}
      <div className="modal-action">
        <Button type="button" onClick={onClose} disabled={isSubmitting}>
          Close
        </Button>
      </div>
    </Modal>
  );
};

export default AssessmentEditModal;