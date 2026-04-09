import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import SchemaRequestModal from '@components/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/forms/widgets/FileOrTextWidget';
import { buildRequestSchema, buildSerializerUploadUiSchema } from '@lib/formSchemas';

import type { LoadQuestionSetRequest } from '@api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const QuestionSetUploadModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const schemaForRender = useMemo(() => buildRequestSchema('LoadQuestionSetRequest'), []);

  return (
    <SchemaRequestModal<LoadQuestionSetRequest>
      open={open}
      title="Upload Question Set"
      schema={schemaForRender}
      onClose={onClose}
      mutationKey={['questionSet', assessmentId, 'upload']}
      mutationFn={async (payload) =>
        (await api.setQuestionSetByDataAssessmentsAssessmentIdQuestionSetUploadPut(assessmentId, payload)).data
      }
      successMessage="Question set uploaded"
      errorMessage="Upload failed"
      onSuccess={async () => {
        await qc.invalidateQueries({ queryKey: QK.questionSet.item(assessmentId) });
        await qc.invalidateQueries({ queryKey: QK.questionSet.parsed(assessmentId) });
        await qc.invalidateQueries({ queryKey: QK.assessments.item(assessmentId) });
      }}
      initialValues={() => ({ data: '', serializer: { format: 'yaml' } } as LoadQuestionSetRequest)}
      buildUiSchema={buildSerializerUploadUiSchema}
      widgets={{ FileOrTextWidget }}
      submitIdleLabel="Upload"
      submitLoadingLabel="Uploading\u2026"
    />
  );
};

export default QuestionSetUploadModal;
