import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import SchemaRequestModal from '@components/forms/SchemaRequestModal';
import FileOrTextWidget from '@components/forms/widgets/FileOrTextWidget';
import { fileAcceptForConfig, type HasFormatField } from '@lib/uploads';
import requestsSchema from '@schemas/requests.json';

import type { LoadQuestionSetRequest } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const QuestionSetUploadModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();
  const requestSchemas = requestsSchema as Record<string, JSONSchema7>;
  const base = requestSchemas.LoadQuestionSetRequest;

  const schemaForRender = useMemo(() => {
    if (!base) return null;
    return { ...base, definitions: requestSchemas };
  }, [base, requestSchemas]);

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

export default QuestionSetUploadModal;