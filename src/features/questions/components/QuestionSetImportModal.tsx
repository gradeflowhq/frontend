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
import type { ImportQuestionSetRequest } from '@api/models';
import { fileAcceptForConfig } from '@lib/uploads';
import { useToast } from '@components/common/ToastProvider';

type Props = { open: boolean; assessmentId: string; onClose: () => void };

const QuestionSetImportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const toast = useToast();

  const base = (requestsSchema as any).ImportQuestionSetRequest;
  const schemaForRender = useMemo(
    () => (base ? { ...base, definitions: requestsSchema as any } : null),
    [base]
  );

  const [values, setValues] = useState<ImportQuestionSetRequest | undefined>(undefined);

  // Generic accept from adapter.format (fallback handled internally)
  const accept = fileAcceptForConfig((values as any)?.adapter);

  const mutation = useMutation({
    mutationKey: ['questionSet', assessmentId, 'import'],
    mutationFn: async (payload: ImportQuestionSetRequest) =>
      (await api.importQuestionSetAssessmentsAssessmentIdQuestionSetImportPut(assessmentId, payload)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.questionSet.item(assessmentId) });
      await qc.invalidateQueries({ queryKey: QK.questionSet.parsed(assessmentId) });
      onClose();
      toast.success('Question set imported');
    },
    onError: () => toast.error('Import failed'),
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="font-bold text-lg">Import Question Set ({values?.adapter.name})</h3>

      {!schemaForRender ? (
        <div className="alert alert-warning mt-2">
          <span>Import schema not available.</span>
        </div>
      ) : (
        <SchemaForm<ImportQuestionSetRequest>
          schema={schemaForRender}
          uiSchema={{
            'ui:title': '',
            data: {
              'ui:widget': 'FileOrTextWidget',
              'ui:options': {
                readAs: 'text',
                accept,
              },
            },
            adapter: {
              // keep adapter.name hidden if it's const (e.g., 'examplify')
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
            // Send string body; backend validates as str/bytes
            await mutation.mutateAsync(formData);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}

      {mutation.isError && <ErrorAlert error={mutation.error} className="mt-3" />}
    </Modal>
  );
};

export default QuestionSetImportModal;