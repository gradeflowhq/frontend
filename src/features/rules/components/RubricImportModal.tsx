import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import SchemaRequestModal from '@components/common/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/common/forms/widgets/FileOrTextWidget';
import { fileAcceptForConfig, type HasFormatField } from '@lib/uploads';
import requestsSchema from '@schemas/requests.json';

import type { ImportRubricRequest } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

type Props = { open: boolean; assessmentId: string; onClose: () => void };

const RubricImportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();

  const requestSchemas = requestsSchema as Record<string, JSONSchema7>;
  const base = requestSchemas.ImportRubricRequest;
  const schemaForRender = useMemo(
    () => (base ? { ...base, definitions: requestSchemas } : null),
    [base, requestSchemas]
  );

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
        await qc.invalidateQueries({ queryKey: QK.rubric.item(assessmentId) });
        await qc.invalidateQueries({ queryKey: QK.rubric.coverage(assessmentId) });
      }}
      successMessage="Rubric imported"
      errorMessage="Import failed"
      buildUiSchema={(formData) => {
          const accept = fileAcceptForConfig(
            (formData as { adapter?: HasFormatField | null | undefined } | undefined)?.adapter ?? null
          );
        return {
          'ui:title': '',
          data: {
            'ui:widget': 'FileOrTextWidget',
            'ui:options': { readAs: 'text', accept },
          },
          adapter: {
            name: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { hidden: true, label: false } },
            format: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { hidden: true, label: false } },
          },
        };
      }}
      widgets={{ FileOrTextWidget }}
      submitIdleLabel="Import"
      submitLoadingLabel="Importing…"
      validate={(formData) => {
        const data = formData?.data as unknown;
        const hasData = data instanceof Blob
          ? data.size > 0
          : typeof data === 'string'
            ? data.length > 0
            : false;
        if (!hasData || !formData) {
          throw new Error('Please choose a file');
        }
      }}
    />
  );
};

export default RubricImportModal;