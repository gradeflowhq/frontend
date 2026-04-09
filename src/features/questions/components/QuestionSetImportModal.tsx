import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import SchemaRequestModal from '@components/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/forms/widgets/FileOrTextWidget';
import { buildAdapterImportUiSchema, buildRequestSchema, validateFileInputRequired } from '@lib/formSchemas';

import type { ImportQuestionSetRequest } from '@api/models';

type Props = { open: boolean; assessmentId: string; onClose: () => void };

const QuestionSetImportModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const schemaForRender = useMemo(() => buildRequestSchema('ImportQuestionSetRequest'), []);

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
        await qc.invalidateQueries({ queryKey: QK.assessments.item(assessmentId) });
      }}
      successMessage="Question set imported"
      errorMessage="Import failed"
      buildUiSchema={buildAdapterImportUiSchema}
      widgets={{ FileOrTextWidget }}
      submitIdleLabel="Import"
      submitLoadingLabel="Importing\u2026"
      validate={validateFileInputRequired}
    />
  );
};

export default QuestionSetImportModal;
