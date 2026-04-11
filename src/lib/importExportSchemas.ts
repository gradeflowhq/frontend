import { fileAcceptForConfig, type HasFormatField } from '@lib/fileFormats';
import requestsSchema from '@schemas/requests.json';

import type { JSONSchema7 } from 'json-schema';

/**
 * Resolves a request schema by key from the shared requests.json, injecting
 * the full definitions map so that $ref resolution works inside SchemaForm.
 */
export const buildRequestSchema = (key: string): Record<string, unknown> | null => {
  const schemas = requestsSchema as Record<string, JSONSchema7>;
  const base = schemas[key];
  return base ? ({ ...base, definitions: schemas } as Record<string, unknown>) : null;
};

/**
 * Shared `buildUiSchema` callback for import modals that use an `adapter`
 * field. Hides `adapter.name` and `adapter.format` and configures the `data`
 * field to accept the right file formats.
 */
export const buildAdapterImportUiSchema = (formData: unknown): Record<string, unknown> => {
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
};

/**
 * Shared `buildUiSchema` callback for upload modals that use a `serializer`
 * field. Hides `serializer.format` and configures `data` with the matching
 * file accept string.
 */
export const buildSerializerUploadUiSchema = (formData: unknown): Record<string, unknown> => {
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
};

/**
 * Shared `validate` callback for import modals that require a non-empty file
 * or text input in the `data` field.
 */
export const validateFileInputRequired = (
  formData: { data?: unknown } | null | undefined
): void => {
  const data = formData?.data;
  const hasData = data instanceof Blob
    ? data.size > 0
    : typeof data === 'string'
      ? data.length > 0
      : false;
  if (!hasData || !formData) {
    throw new Error('Please choose a file');
  }
};