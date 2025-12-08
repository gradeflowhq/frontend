/**
 * Generic helpers to compute a browser file input "accept" string from a format.
 * - Strongly typed: accepts any object with an optional "format" field.
 * - Not tied to "serializer" naming; usable for adapters/serializers/etc.
 * - Mapping is data-driven and overridable; no feature-specific hardcoding.
 */

export type FileFormat = string;

/**
 * Mapping from file format (lowercased) to the accept string.
 * You can extend/override this map at call sites.
 */
export type AcceptMap = Record<FileFormat, string>;

export const DEFAULT_ACCEPT_MAP: AcceptMap = {
  csv: '.csv,text/csv',
  json: '.json,application/json,text/plain',
  yaml: '.yml,.yaml,application/yaml,application/x-yaml,text/plain',
  yml: '.yml,.yaml,application/yaml,application/x-yaml,text/plain',
};

/**
 * Fallback accept string when a format isn’t found in the map.
 */
export const DEFAULT_FALLBACK_ACCEPT =
  '.yml,.yaml,.json,.csv,application/yaml,application/x-yaml,application/json,text/plain,text/csv';

/**
 * Compute accept string from a raw format value (e.g., 'csv', 'yaml').
 * - format is normalized (trim/lowercase)
 * - map is customizable and defaults to DEFAULT_ACCEPT_MAP
 * - fallback is customizable and defaults to DEFAULT_FALLBACK_ACCEPT
 */
export const fileAcceptForFormat = (
  format: unknown,
  map: AcceptMap = DEFAULT_ACCEPT_MAP,
  fallback: string = DEFAULT_FALLBACK_ACCEPT
): string => {
  const key = typeof format === 'string' ? format.trim().toLowerCase() : '';
  return (key && map[key]) || fallback;
};

/**
 * Generic shape for any config that may carry a "format" field.
 * Use this to strongly type your callers (e.g., serializers/adapters).
 */
export interface HasFormatField<F extends FileFormat = FileFormat> {
  format?: F | null;
}

/**
 * Compute accept string from any config object with an optional "format" field.
 * Keeps the same override points as fileAcceptForFormat.
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