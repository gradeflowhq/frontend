import React, { useMemo } from 'react';

import { api } from '@api';
import SchemaDownloadModal from '@components/forms/SchemaDownloadModal';
import { buildRequestSchema, buildSerializerRequestUiSchema } from '@lib/importExportSchemas';

import type { ExportRubricRequest, ExportRubricResponse } from '@api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const RubricExportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const schemaForRender = useMemo(() => buildRequestSchema('ExportRubricRequest'), []);

  return (
    <SchemaDownloadModal<ExportRubricRequest, ExportRubricResponse>
      open={open}
      title="Export Rubric"
      schema={schemaForRender}
      onClose={onClose}
      mutationKey={['rubric', assessmentId, 'export'] as const}
      mutationFn={async (payload) =>
        (await api.exportRubricAssessmentsAssessmentIdRubricExportPost(assessmentId, payload)).data
      }
      buildUiSchema={buildSerializerRequestUiSchema}
      submitIdleLabel="Export"
      submitLoadingLabel="Exporting…"
      successMessage="Rubric download started"
      notFoundMessage="Export is not available from the current backend. Restart the backend and refresh the page, then try again. If it still fails, save the rubric first."
    />
  );
};

export default RubricExportModal;