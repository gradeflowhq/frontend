import React, { useMemo, useState } from 'react';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import FileOrTextWidget from '@components/common/forms/widgets/FileOrTextWidget';
import requestsSchema from '@schemas/requests.json';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type { ImportRubricRequest } from '@api/models';
import { fileAcceptForConfig } from '@lib/uploads';

type Props = { open: boolean; assessmentId: string; onClose: () => void };

const RubricImportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();

  const base = (requestsSchema as any).ImportRubricRequest;
  const schemaForRender = useMemo(
    () => (base ? { ...base, definitions: requestsSchema as any } : null),
    [base]
  );

  const [values, setValues] = useState<ImportRubricRequest | undefined>(undefined);

  // Generic accept from adapter.format (fallback handled internally)
  const accept = fileAcceptForConfig((values as any)?.adapter);

  const mutation = useMutation({
    mutationKey: ['rubric', assessmentId, 'import'],
    mutationFn: async (payload: ImportRubricRequest) =>
      (await api.importRubricAssessmentsAssessmentIdRubricImportPut(assessmentId, payload)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="font-bold text-lg">Import Rubric ({values?.adapter.name})</h3>
      {!schemaForRender ? (
        <div className="alert alert-warning mt-2"><span>Import schema not available.</span></div>
      ) : (
        <SchemaForm<ImportRubricRequest>
          schema={schemaForRender}
          uiSchema={{
            'ui:title': '',
            data: {
              'ui:widget': 'FileOrTextWidget',
              'ui:options': { readAs: 'text', accept },
            },
            adapter: {
              // hide const adapter name for a cleaner UI
              name: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { hidden:true, label: false } },
              format: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { hidden:true, label: false } },
            },
          }}
          templates={{ FieldTemplate: HiddenAwareFieldTemplate }}
          widgets={{ FileOrTextWidget }}
          formData={values}
          onChange={({ formData }) => setValues(formData)}
          isSubmitting={mutation.isPending}
          submitIdleLabel="Import"
          submitLoadingLabel="Importing…"
          onSubmit={async ({ formData }) => {
            const data = formData?.data as unknown;
            const hasData = data instanceof Blob
              ? data.size > 0
              : typeof data === 'string'
                ? data.length > 0
                : false;
            if (!hasData || !formData) {
              throw new Error('Please choose a file');
            }
            // Send string body
            await mutation.mutateAsync(formData);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}
      {mutation.isError && <ErrorAlert error={mutation.error} className="mt-3" />}
    </Modal>
  );
};

export default RubricImportModal;