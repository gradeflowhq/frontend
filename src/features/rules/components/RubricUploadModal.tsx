import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import FileOrTextWidget from '@components/common/forms/widgets/FileOrTextWidget';
import requestsSchema from '@schemas/requests.json';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type { LoadRubricRequest } from '@api/models';
import { fileAcceptForConfig } from '@lib/uploads';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const RubricUploadModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const base = (requestsSchema as any).LoadRubricRequest;

  const schemaForRender = useMemo(() => {
    if (!base) return null;
    return { ...base, definitions: requestsSchema as any };
  }, [base]);

  const [values, setValues] = useState<LoadRubricRequest | undefined>(undefined);

  // Seed defaults on open
  useEffect(() => {
    if (!open || !schemaForRender) return;
    setValues({ data: '', serializer: { format: 'yaml' } } as LoadRubricRequest);
  }, [open, schemaForRender]);

  // Accept based on serializer.format
  const accept = fileAcceptForConfig((values as any)?.serializer);

  const mutation = useMutation({
    mutationKey: ['rubric', assessmentId, 'upload'],
    mutationFn: async (payload: LoadRubricRequest) =>
      (await api.setRubricByDataAssessmentsAssessmentIdRubricUploadPut(assessmentId, payload)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="font-bold text-lg">Upload Rubric</h3>
      {!schemaForRender ? (
        <div className="alert alert-warning mt-2"><span>Upload schema not available.</span></div>
      ) : (
        <SchemaForm<LoadRubricRequest>
          schema={schemaForRender}
          uiSchema={{
            'ui:title': '',
            serializer: {
              'ui:title': '',
              'ui:options': { label: false },
              format: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
            },
            data: {
              'ui:widget': 'FileOrTextWidget',
              'ui:options': { readAs: 'text', accept },
            },
          }}
          templates={{ FieldTemplate: HiddenAwareFieldTemplate }}
          widgets={{ FileOrTextWidget }}
          formData={values}
          onChange={({ formData }) => setValues(formData)}
          isSubmitting={mutation.isPending}
          submitIdleLabel="Upload"
          submitLoadingLabel="Uploading…"
          onSubmit={async ({ formData }) => {
            if (!formData) return;
            await mutation.mutateAsync(formData);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}
      {mutation.isError && <ErrorAlert error={mutation.error} className="mt-3" />}
    </Modal>
  );
};

export default RubricUploadModal;