import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { api } from '@api';
import { invalidateRubricQueries } from '@api/queryInvalidation';
import SchemaRequestModal from '@components/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/forms/widgets/FileOrTextWidget';
import { buildAdapterImportUiSchema, buildRequestSchema, validateFileInputRequired } from '@lib/importExportSchemas';

import type { ImportRubricRequest } from '@api/models';

type Props = { open: boolean; assessmentId: string; onClose: () => void };

const RubricImportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const schemaForRender = useMemo(() => buildRequestSchema('ImportRubricRequest'), []);

  return (
    <SchemaRequestModal<ImportRubricRequest>
      open={open}
      title="Import Rubric"
      schema={schemaForRender}
      onClose={onClose}
      mutationKey={['rubric', assessmentId, 'import']}
      mutationFn={async (payload) =>
        (await api.importRubricAssessmentsAssessmentIdRubricImportPut(assessmentId, payload)).data
      }
      onSuccess={async () => {
        await invalidateRubricQueries(qc, assessmentId);
      }}
      successMessage="Rubric imported"
      errorMessage="Import failed"
      buildUiSchema={buildAdapterImportUiSchema}
      widgets={{ FileOrTextWidget }}
      submitIdleLabel="Import"
      submitLoadingLabel="Importing…"
      validate={validateFileInputRequired}
    />
  );
};

export default RubricImportModal;