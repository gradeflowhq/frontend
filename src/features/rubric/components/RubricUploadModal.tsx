import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { api } from '@api';
import { invalidateRubricQueries } from '@api/queryInvalidation';
import SchemaRequestModal from '@components/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/forms/widgets/FileOrTextWidget';
import { buildRequestSchema, buildSerializerUploadUiSchema } from '@lib/importExportSchemas';

import type { LoadRubricRequest } from '@api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const RubricUploadModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const schemaForRender = useMemo(() => buildRequestSchema('LoadRubricRequest'), []);

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
        await invalidateRubricQueries(qc, assessmentId);
      }}
      initialValues={() => ({ data: '', serializer: { format: 'yaml' } } as LoadRubricRequest)}
      buildUiSchema={buildSerializerUploadUiSchema}
      widgets={{ FileOrTextWidget }}
      submitIdleLabel="Upload"
      submitLoadingLabel="Uploading…"
    />
  );
};

export default RubricUploadModal;