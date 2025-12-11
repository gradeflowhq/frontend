import React, { useMemo, useState } from 'react';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import requestsSchema from '@schemas/requests.json';
import { useMutation } from '@tanstack/react-query';
import { api } from '@api';
import { saveBlob } from '@lib/files';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { tryDecodeExportCsv } from '@features/submissions/helpers';
import type { GradingDownloadRequest, GradingDownloadResponse } from '@api/models';
import { useToast } from '@components/common/ToastProvider';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
  selectedFormat?: string; // e.g. 'CSV' | 'JSON' | 'YAML' (case-insensitive)
};

const requestSchemas = requestsSchema as Record<string, JSONSchema7>;

// Resolve a $ref like "#/definitions/CsvGradedSubmissionsConfig" from requestsSchema
const resolveRef = (node: JSONSchema7 | JSONSchema7Definition | undefined): JSONSchema7 | undefined => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined;
  if (typeof node.$ref !== 'string') return node;

  const match = node.$ref.match(/^#\/definitions\/(.+)$/);
  if (!match) return node;
  const key = match[1];
  const def = requestSchemas[key];
  return def ?? node;
};

// Extract serializer oneOf entries and resolve $ref
const getResolvedSerializerOptions = (downloadSchema?: JSONSchema7): JSONSchema7[] => {
  if (!downloadSchema || typeof downloadSchema !== 'object') return [];
  const serializerDef = downloadSchema.properties?.serializer as JSONSchema7 | JSONSchema7Definition | undefined;
  if (!serializerDef || typeof serializerDef !== 'object' || Array.isArray(serializerDef)) return [];
  const oneOf = serializerDef.oneOf;
  if (!Array.isArray(oneOf)) return [];
  return oneOf
    .map((opt) => resolveRef(opt))
    .filter((opt): opt is JSONSchema7 => !!opt);
};

// Pick the concrete serializer schema by selectedFormat (case-insensitive)
const pickSerializerSchema = (downloadSchema: JSONSchema7 | undefined, selectedFormat?: string): JSONSchema7 | null => {
  const options = getResolvedSerializerOptions(downloadSchema);
  if (options.length === 0) return null;
  if (!selectedFormat) return options[0];
  const wanted = String(selectedFormat).toLowerCase();
  const found = options.find((s) => {
    const formatConst = typeof s?.properties?.format === 'object' && s?.properties?.format && !Array.isArray(s.properties.format)
      ? (s.properties.format as JSONSchema7).const
      : undefined;
    return String(formatConst ?? '').toLowerCase() === wanted;
  });
  return found || options[0];
};

// Build final schema with concrete serializer (no oneOf) and attach definitions
const buildSchemaForRender = (baseSchema: JSONSchema7, concreteSerializer: JSONSchema7): JSONSchema7 => {
  const clone: JSONSchema7 = JSON.parse(JSON.stringify(baseSchema));
  if (clone?.properties?.serializer && typeof clone.properties.serializer === 'object' && !Array.isArray(clone.properties.serializer)) {
    const serializer = { ...(concreteSerializer as Record<string, unknown>) } as JSONSchema7 & Record<string, unknown>;
    delete serializer.oneOf;
    delete serializer.discriminator;
    delete serializer.$ref;
    clone.properties.serializer = serializer;
  }
  // Attach definitions so nested refs resolve
  clone.definitions = requestSchemas;
  return clone;
};

// Materialise defaults/const across an object schema (only enough for our serializer config)
const materialiseDefaults = (schema?: JSONSchema7): unknown => {
  if (!schema || typeof schema !== 'object') return undefined;
  if (schema.type === 'object' && schema.properties) {
    const out: Record<string, unknown> = {};
    for (const [k, prop] of Object.entries(schema.properties)) {
      if (!prop || typeof prop !== 'object' || Array.isArray(prop)) continue;
      if (prop.const !== undefined) out[k] = prop.const;
      else if (prop.default !== undefined) out[k] = prop.default;
      else {
        const child = materialiseDefaults(prop as JSONSchema7);
        if (child !== undefined) out[k] = child;
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

const ResultsDownloadModalInner: React.FC<Props> = ({ open, assessmentId, onClose, selectedFormat }) => {
  const { passphrase } = useAssessmentPassphrase();
  const toast = useToast();

  // Base schema (has oneOf with $ref)
  const baseSchema = requestSchemas.GradingDownloadRequest;

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
      const payload = res.data;

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
      toast.success('Grading download started');
    },
    onError: () => toast.error('Download failed'),
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

const ResultsDownloadModal: React.FC<Props> = (props) => {
  if (!props.open) return null;
  return <ResultsDownloadModalInner key={props.selectedFormat ?? 'default'} {...props} />;
};

export default ResultsDownloadModal;