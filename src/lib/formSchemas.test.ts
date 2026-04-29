import { describe, expect, it } from 'vitest';

import { buildRequestSchema, buildSerializerRequestUiSchema, validateFileInputRequired } from '@lib/importExportSchemas';

describe('buildRequestSchema', () => {
  it('returns a schema object for a known key', () => {
    const schema = buildRequestSchema('GradingDownloadRequest');
    expect(schema).not.toBeNull();
    expect(schema).toHaveProperty('definitions');
  });

  it('returns null for an unknown key', () => {
    expect(buildRequestSchema('NonExistentKey')).toBeNull();
  });
});

describe('validateFileInputRequired', () => {
  it('throws for null formData', () => {
    expect(() => validateFileInputRequired(null)).toThrow('Please choose a file');
  });

  it('throws for undefined data', () => {
    expect(() => validateFileInputRequired({ data: undefined })).toThrow('Please choose a file');
  });

  it('throws for empty string data', () => {
    expect(() => validateFileInputRequired({ data: '' })).toThrow('Please choose a file');
  });

  it('does not throw for non-empty string data', () => {
    expect(() => validateFileInputRequired({ data: 'hello' })).not.toThrow();
  });

  it('throws for empty Blob', () => {
    expect(() => validateFileInputRequired({ data: new Blob([]) })).toThrow('Please choose a file');
  });

  it('does not throw for non-empty Blob', () => {
    expect(() => validateFileInputRequired({ data: new Blob(['data']) })).not.toThrow();
  });
});

describe('buildSerializerRequestUiSchema', () => {
  it('hides serializer format while leaving serializer-driven forms schema-based', () => {
    expect(buildSerializerRequestUiSchema()).toEqual({
      'ui:title': '',
      serializer: {
        'ui:title': '',
        'ui:options': { label: false },
        format: { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } },
      },
    });
  });
});
