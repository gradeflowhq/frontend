import React, { useMemo } from 'react';

import { api } from '@api';
import SchemaDownloadModal from '@components/forms/SchemaDownloadModal';
import { buildRequestSchema, buildSerializerRequestUiSchema } from '@lib/importExportSchemas';

import type { ExportQuestionSetRequest, ExportQuestionSetResponse } from '@api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const QuestionSetExportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const schemaForRender = useMemo(() => buildRequestSchema('ExportQuestionSetRequest'), []);

  return (
    <SchemaDownloadModal<ExportQuestionSetRequest, ExportQuestionSetResponse>
      open={open}
      title="Export Question Set"
      schema={schemaForRender}
      onClose={onClose}
      mutationKey={['questionSet', assessmentId, 'export'] as const}
      mutationFn={async (payload) =>
        (await api.exportQuestionSetAssessmentsAssessmentIdQuestionSetExportPost(assessmentId, payload)).data
      }
      buildUiSchema={buildSerializerRequestUiSchema}
      submitIdleLabel="Export"
      submitLoadingLabel="Exporting…"
      successMessage="Question set download started"
      notFoundMessage="Export is not available from the current backend. Restart the backend and refresh the page, then try again. If it still fails, save the question set first."
    />
  );
};

export default QuestionSetExportModal;