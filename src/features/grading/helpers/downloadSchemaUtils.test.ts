import { describe, expect, it } from 'vitest';

import {
  buildSchemaForRender,
  materialiseDefaults,
  pickSerializerSchema,
  resolveRef,
} from '@features/grading/helpers/downloadSchemaUtils';

import type { JSONSchema7 } from 'json-schema';

describe('resolveRef', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveRef(undefined)).toBeUndefined();
  });

  it('returns undefined for array input', () => {
    expect(resolveRef([] as never)).toBeUndefined();
  });

  it('returns the node itself when no $ref', () => {
    const node = { type: 'string' } as JSONSchema7;
    expect(resolveRef(node)).toBe(node);
  });

  it('returns the node when $ref format is not #/definitions/', () => {
    const node = { $ref: 'external.json#/Foo' } as JSONSchema7;
    expect(resolveRef(node)).toBe(node);
  });
});

describe('pickSerializerSchema', () => {
  it('returns null for undefined schema', () => {
    expect(pickSerializerSchema(undefined)).toBeNull();
  });

  it('returns null for schema without serializer oneOf', () => {
    const schema = { properties: { serializer: { type: 'object' } } } as JSONSchema7;
    expect(pickSerializerSchema(schema)).toBeNull();
  });
});

describe('buildSchemaForRender', () => {
  it('does not mutate the original base schema', () => {
    const base = {
      properties: {
        serializer: {
          oneOf: [{ $ref: '#/definitions/Foo' }],
          discriminator: { propertyName: 'format' },
        },
      },
    } as JSONSchema7;
    const original = JSON.parse(JSON.stringify(base));
    const concrete = { type: 'object' } as JSONSchema7;
    buildSchemaForRender(base, concrete);
    expect(base).toEqual(original);
  });

  it('replaces serializer and attaches definitions', () => {
    const base: JSONSchema7 = {
      properties: {
        serializer: {
          oneOf: [{ $ref: '#/definitions/Foo' }],
        },
      },
    };
    const concrete = { type: 'object', properties: { format: { const: 'csv' } } } as JSONSchema7;
    const result = buildSchemaForRender(base, concrete);
    const ser = result.properties?.serializer as JSONSchema7;
    expect(ser.type).toBe('object');
    expect((ser as Record<string, unknown>).oneOf).toBeUndefined();
    expect(result.definitions).toBeDefined();
  });
});

describe('materialiseDefaults', () => {
  it('returns undefined for undefined input', () => {
    expect(materialiseDefaults(undefined)).toBeUndefined();
  });

  it('extracts const values from object properties', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        format: { const: 'csv' },
        precision: { default: 3 },
      },
    };
    expect(materialiseDefaults(schema)).toEqual({ format: 'csv', precision: 3 });
  });

  it('recurses into nested objects', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        inner: {
          type: 'object',
          properties: {
            value: { const: 42 },
          },
        },
      },
    };
    expect(materialiseDefaults(schema)).toEqual({ inner: { value: 42 } });
  });

  it('handles array with default', () => {
    const schema: JSONSchema7 = {
      type: 'array',
      default: [1, 2, 3],
    };
    expect(materialiseDefaults(schema)).toEqual([1, 2, 3]);
  });

  it('returns undefined for array without default', () => {
    const schema: JSONSchema7 = { type: 'array' };
    expect(materialiseDefaults(schema)).toBeUndefined();
  });

  it('returns scalar const directly', () => {
    const schema: JSONSchema7 = { const: 'hello' };
    expect(materialiseDefaults(schema)).toBe('hello');
  });
});
