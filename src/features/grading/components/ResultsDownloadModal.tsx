import React, { useMemo, useState, useEffect } from 'react';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import requestsSchema from '@schemas/requests.json';
import { useMutation } from '@tanstack/react-query';
import { api } from '@api';
import { saveBlob } from '@lib/files';
import { useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';
import { tryDecodeExportCsv } from '@features/submissions/helpers';
import type { GradingDownloadRequest, GradingDownloadResponse } from '@api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
  selectedFormat?: string; // e.g. 'CSV' | 'JSON' | 'YAML' (case-insensitive)
};

// Resolve a $ref like "#/definitions/CsvGradedSubmissionsConfig" from requestsSchema
const resolveRef = (node: any): any => {
  if (node && typeof node === 'object' && typeof node.$ref === 'string') {
    const ref: string = node.$ref;
    const m = ref.match(/^#\/definitions\/(.+)$/);
    if (m) {
      const key = m[1];
      const def = (requestsSchema as any)[key];
      return def || node;
    }
  }
  return node;
};

// Extract serializer oneOf entries and resolve $ref
const getResolvedSerializerOptions = (downloadSchema: any): any[] => {
  const oneOf = downloadSchema?.properties?.serializer?.oneOf;
  if (!Array.isArray(oneOf)) return [];
  return oneOf.map((opt) => resolveRef(opt));
};

// Pick the concrete serializer schema by selectedFormat (case-insensitive)
const pickSerializerSchema = (downloadSchema: any, selectedFormat?: string): any | null => {
  const options = getResolvedSerializerOptions(downloadSchema);
  if (options.length === 0) return null;
  if (!selectedFormat) return options[0];
  const wanted = String(selectedFormat).toLowerCase();
  const found = options.find((s: any) => String(s?.properties?.format?.const ?? '').toLowerCase() === wanted);
  return found || options[0];
};

// Build final schema with concrete serializer (no oneOf) and attach definitions
const buildSchemaForRender = (baseSchema: any, concreteSerializer: any) => {
  const clone = JSON.parse(JSON.stringify(baseSchema));
  if (clone?.properties?.serializer) {
    clone.properties.serializer = { ...concreteSerializer };
    delete clone.properties.serializer.oneOf;
    delete clone.properties.serializer.discriminator;
    delete clone.properties.serializer.$ref;
  }
  // Attach definitions so nested refs resolve
  clone.definitions = requestsSchema as any;
  return clone;
};

// Materialise defaults/const across an object schema (only enough for our serializer config)
const materialiseDefaults = (schema: any): any => {
  if (!schema || typeof schema !== 'object') return undefined;
  if (schema.type === 'object' && schema.properties) {
    const out: Record<string, any> = {};
    for (const [k, prop] of Object.entries<any>(schema.properties)) {
      if (prop && typeof prop === 'object') {
        if (prop.const !== undefined) out[k] = prop.const;
        else if (prop.default !== undefined) out[k] = prop.default;
        else {
          const child = materialiseDefaults(prop);
          if (child !== undefined) out[k] = child;
        }
      }
    }
    return out;
  }
  if (schema.type === 'array') {
    if (Array.isArray(schema.default)) return [...schema.default];
    return undefined;
  }
  if (schema.const !== undefined) return schema.const;
  if (schema.default !== undefined) return schema.default;
  return undefined;
};

const ResultsDownloadModal: React.FC<Props> = ({ open, assessmentId, onClose, selectedFormat }) => {
  const { passphrase } = useAssessmentPassphrase();

  // Base schema (has oneOf with $ref)
  const baseSchema = (requestsSchema as any).GradingDownloadRequest;

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
  const [formData, setFormData] = useState<GradingDownloadRequest | undefined>(undefined);
  useEffect(() => {
    if (!open || !concreteSerializer) return;
    const serializerDefaults = materialiseDefaults(concreteSerializer);
    setFormData({ serializer: serializerDefaults } as GradingDownloadRequest);
  }, [open, concreteSerializer]);

  const downloadMutation = useMutation({
    mutationKey: ['grading', assessmentId, 'download', (selectedFormat || 'default').toLowerCase()],
    mutationFn: async (payload: GradingDownloadRequest) =>
      (await api.downloadGradingAssessmentsAssessmentIdGradingDownloadPost(assessmentId, payload)).data as GradingDownloadResponse,
    onSuccess: async (res) => {
      const ext = (res.extension || '').toLowerCase();
      const filename = res.filename || `grading.${ext || 'txt'}`;
      const mediaType = res.media_type || 'application/octet-stream';

      if (ext === 'csv' && passphrase) {
        const rawText = await (res.data as any);
        const decoded = await tryDecodeExportCsv(rawText, { passphrase });
        const blob = new Blob([decoded], { type: 'text/csv;charset=utf-8' });
        saveBlob(blob, filename);
      } else {
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data as any], { type: mediaType });
        saveBlob(blob, filename);
      }
      onClose();
    },
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

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="font-bold text-lg">
        Download Grading{selectedFormat ? ` (${selectedFormat.toUpperCase()})` : ''}
      </h3>

      {!schemaForRender ? (
        <div className="alert alert-warning mt-2">
          <span>Download schema not available.</span>
        </div>
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
          onSubmit={async ({ formData }) => {
            if (!formData) return;
            await downloadMutation.mutateAsync(formData);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}

      {downloadMutation.isError && <ErrorAlert error={downloadMutation.error} className="mt-3" />}
    </Modal>
  );
};

export default ResultsDownloadModal;