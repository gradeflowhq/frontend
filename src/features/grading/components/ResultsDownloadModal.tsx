import { Modal, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';

import { api } from '@api';
import HiddenAwareFieldTemplate from '@components/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/forms/SchemaForm';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { tryDecodeExportCsv } from '@features/submissions/helpers';
import { saveBlob } from '@lib/files';
import { getErrorMessage } from '@utils/error';

import { buildSchemaForRender, gradingDownloadBaseSchema, materialiseDefaults, pickSerializerSchema } from '../helpers/downloadSchemaUtils';

import type { GradingDownloadRequest, GradingDownloadResponse } from '@api/models';

type Props = {
  opened: boolean;
  assessmentId: string;
  onClose: () => void;
  selectedFormat?: string; // e.g. 'CSV' | 'JSON' | 'YAML' (case-insensitive)
};



const ResultsDownloadModalInner: React.FC<Props> = ({ opened, assessmentId, onClose, selectedFormat }) => {
  const { passphrase } = useAssessmentPassphrase();

  // Base schema (has oneOf with $ref)
  const baseSchema = gradingDownloadBaseSchema;

  // Resolve concrete serializer by selectedFormat
  const concreteSerializer = useMemo(
    () => pickSerializerSchema(baseSchema, selectedFormat),
    [baseSchema, selectedFormat]
  );

  // Final schema for RJSF: serializer is a concrete object, plus definitions
  const schemaForRender = useMemo(() => {
    if (!baseSchema || !concreteSerializer) return null;
    return buildSchemaForRender(baseSchema, concreteSerializer);
  }, [baseSchema, concreteSerializer]);

  // Initial formData with defaults from the resolved serializer schema
  const initialFormData = useMemo(() => {
    if (!concreteSerializer) return undefined;
    const serializerDefaults = materialiseDefaults(concreteSerializer);
    return { serializer: serializerDefaults } as GradingDownloadRequest;
  }, [concreteSerializer]);

  const [formData, setFormData] = useState<GradingDownloadRequest | undefined>(initialFormData);

  const downloadMutation = useMutation({
    mutationKey: ['grading', assessmentId, 'download', (selectedFormat || 'default').toLowerCase()],
    mutationFn: async (payload: GradingDownloadRequest) =>
      (await api.downloadGradingAssessmentsAssessmentIdGradingDownloadPost(assessmentId, payload)).data as GradingDownloadResponse,
    onSuccess: async (res) => {
      const ext = (res.extension || '').toLowerCase();
      const filename = res.filename || `grading.${ext || 'txt'}`;
      const mediaType = res.media_type || 'application/octet-stream';
      const payload = res.data as string | Blob;

      if (ext === 'csv' && passphrase) {
        const rawText = payload instanceof Blob ? await payload.text() : String(payload ?? '');
        const decoded = await tryDecodeExportCsv(rawText, { passphrase });
        const blob = new Blob([decoded], { type: 'text/csv;charset=utf-8' });
        saveBlob(blob, filename);
      } else {
        const blob = payload instanceof Blob ? payload : new Blob([payload as BlobPart], { type: mediaType });
        saveBlob(blob, filename);
      }
      onClose();
      notifications.show({ color: 'green', message: 'Grading download started' });
    },
    onError: () => notifications.show({ color: 'red', message: 'Download failed' }),
  });

  const uiSchema = useMemo(
    () => ({
      'ui:title': '',
      serializer: {
        'ui:title': '',
        // hide the const "format" (csv/json/yaml)
        format: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
      },
    }),
    []
  );
  const templates = useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate }), []);

  return (
    <Modal opened={opened} onClose={onClose} title={`Download Grading${selectedFormat ? ` (${selectedFormat.toUpperCase()})` : ''}`}>
      {!schemaForRender ? (
        <Alert color="yellow" mt="sm">Download schema not available.</Alert>
      ) : (
        <SchemaForm<GradingDownloadRequest>
          schema={schemaForRender}
          uiSchema={uiSchema}
          templates={templates}
          formData={formData}
          submitIdleLabel="Download" 
          submitLoadingLabel="Downloading…"
          onChange={({ formData }) => setFormData(formData)}
          isSubmitting={downloadMutation.isPending}
          onSubmit={({ formData }) => {
            if (!formData) return;
            void downloadMutation.mutateAsync(formData);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}

      {downloadMutation.isError && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} mt="md">
          {getErrorMessage(downloadMutation.error)}
        </Alert>
      )}
    </Modal>
  );
};

const ResultsDownloadModal: React.FC<Props> = (props) => {
  if (!props.opened) return null;
  return <ResultsDownloadModalInner key={props.selectedFormat ?? 'default'} {...props} />
};

export default ResultsDownloadModal;