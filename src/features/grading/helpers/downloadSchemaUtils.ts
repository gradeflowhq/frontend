import requestsSchema from '@schemas/requests.json';

import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

const requestSchemas = requestsSchema as Record<string, JSONSchema7>;

/** Resolve a $ref like "#/definitions/CsvGradedSubmissionsConfig" from requestsSchema */
export const resolveRef = (node: JSONSchema7 | JSONSchema7Definition | undefined): JSONSchema7 | undefined => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined;
  if (typeof node.$ref !== 'string') return node;

  const match = node.$ref.match(/^#\/definitions\/(.+)$/);
  if (!match) return node;
  const key = match[1];
  const def = requestSchemas[key];
  return def ?? node;
};

/** Extract serializer oneOf entries and resolve $ref */
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

/** Pick the concrete serializer schema by selectedFormat (case-insensitive) */
export const pickSerializerSchema = (downloadSchema: JSONSchema7 | undefined, selectedFormat?: string): JSONSchema7 | null => {
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

/** Build final schema with concrete serializer (no oneOf) and attach definitions */
export const buildSchemaForRender = (baseSchema: JSONSchema7, concreteSerializer: JSONSchema7): JSONSchema7 => {
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

/** Materialise defaults/const across an object schema (only enough for our serializer config) */
export const materialiseDefaults = (schema?: JSONSchema7): unknown => {
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

export const gradingDownloadBaseSchema = requestSchemas.GradingDownloadRequest;
