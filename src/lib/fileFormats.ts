/**
 * Helpers for deriving browser file input `accept` strings from serializer or
 * adapter formats.
 */

export type FileFormat = string;

/**
 * Mapping from file format (lowercased) to the accept string.
 * Call sites can extend or override this map when needed.
 */
type AcceptMap = Record<FileFormat, string>;

const DEFAULT_ACCEPT_MAP: AcceptMap = {
  csv: '.csv,text/csv',
  json: '.json,application/json,text/plain',
  yaml: '.yml,.yaml,application/yaml,application/x-yaml,text/plain',
  yml: '.yml,.yaml,application/yaml,application/x-yaml,text/plain',
};

/**
 * Fallback accept string when a format isn’t found in the map.
 */
const DEFAULT_FALLBACK_ACCEPT =
  '.yml,.yaml,.json,.csv,application/yaml,application/x-yaml,application/json,text/plain,text/csv';

/**
 * Compute accept string from a raw format value (e.g., 'csv', 'yaml').
 */
const fileAcceptForFormat = (
  format: unknown,
  map: AcceptMap = DEFAULT_ACCEPT_MAP,
  fallback: string = DEFAULT_FALLBACK_ACCEPT
): string => {
  const key = typeof format === 'string' ? format.trim().toLowerCase() : '';
  return (key && map[key]) || fallback;
};

/**
 * Generic shape for any config object that may carry a `format` field.
 */
export interface HasFormatField<F extends FileFormat = FileFormat> {
  format?: F | null;
}

/**
 * Compute accept string from any config object with an optional `format` field.
 */
export const fileAcceptForConfig = <
  T extends HasFormatField = HasFormatField
>(
  config: T | null | undefined,
  map: AcceptMap = DEFAULT_ACCEPT_MAP,
  fallback: string = DEFAULT_FALLBACK_ACCEPT
): string => {
  return fileAcceptForFormat(config?.format, map, fallback);
};