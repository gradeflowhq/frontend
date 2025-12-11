import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import SchemaRequestModal from '@components/common/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/common/forms/widgets/FileOrTextWidget';
import { fileAcceptForConfig, type HasFormatField } from '@lib/uploads';
import requestsSchema from '@schemas/requests.json';

import type { LoadRubricRequest } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const RubricUploadModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const requestSchemas = requestsSchema as Record<string, JSONSchema7>;
  const base = requestSchemas.LoadRubricRequest;

  const schemaForRender = useMemo(() => {
    if (!base) return null;
    return { ...base, definitions: requestSchemas };
  }, [base, requestSchemas]);

  return (
    <SchemaRequestModal<LoadRubricRequest>
      open={open}
      title="Upload Rubric"
      schema={schemaForRender}
      onClose={onClose}
      mutationKey={['rubric', assessmentId, 'upload']}
      mutationFn={async (payload) =>
        (await api.setRubricByDataAssessmentsAssessmentIdRubricUploadPut(assessmentId, payload)).data
      }
      successMessage="Rubric uploaded"
      errorMessage="Upload failed"
      onSuccess={async () => {
        await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
        await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
      }}
      initialValues={() => ({ data: '', serializer: { format: 'yaml' } } as LoadRubricRequest)}
      buildUiSchema={(formData) => {
        const accept = fileAcceptForConfig(
          (formData as { serializer?: HasFormatField | null | undefined } | undefined)?.serializer ?? null
        );
        return {
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
        };
      }}
      widgets={{ FileOrTextWidget }}
      submitIdleLabel="Upload"
      submitLoadingLabel="Uploading…"
    />
  );
};

export default RubricUploadModal;