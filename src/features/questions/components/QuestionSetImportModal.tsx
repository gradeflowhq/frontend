import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import SchemaRequestModal from '@components/common/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/common/forms/widgets/FileOrTextWidget';
import requestsSchema from '@schemas/requests.json';
import { fileAcceptForConfig, type HasFormatField } from '@lib/uploads';

import type { ImportQuestionSetRequest } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

type Props = { open: boolean; assessmentId: string; onClose: () => void };

const QuestionSetImportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();

  const requestSchemas = requestsSchema as Record<string, JSONSchema7>;
  const base = requestSchemas.ImportQuestionSetRequest;
  const schemaForRender = useMemo(
    () => (base ? { ...base, definitions: requestSchemas } : null),
    [base, requestSchemas]
  );

  return (
    <SchemaRequestModal<ImportQuestionSetRequest>
      open={open}
      title="Import Question Set"
      schema={schemaForRender}
      onClose={onClose}
      mutationKey={['questionSet', assessmentId, 'import']}
      mutationFn={async (payload) =>
        (await api.importQuestionSetAssessmentsAssessmentIdQuestionSetImportPut(assessmentId, payload)).data
      }
      onSuccess={async () => {
        await qc.invalidateQueries({ queryKey: QK.questionSet.item(assessmentId) });
        await qc.invalidateQueries({ queryKey: QK.questionSet.parsed(assessmentId) });
      }}
      successMessage="Question set imported"
      errorMessage="Import failed"
      buildUiSchema={(formData) => {
        const accept = fileAcceptForConfig(
          (formData as { adapter?: HasFormatField | null | undefined } | undefined)?.adapter ?? null
        );
        return {
          'ui:title': '',
          data: {
            'ui:widget': 'FileOrTextWidget',
            'ui:options': {
              readAs: 'text',
              accept,
            },
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

export default QuestionSetImportModal;