/**
 * Parse a value into a number, returning undefined if invalid.
 */
export const parseNumber = (value?: string | number | null): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Format a numeric value to 3 decimal places, removing trailing zeros.
 */
export const formatNumericValue = (value?: number | string | null) => {
  if (value === undefined || value === null) return value as number | undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(3)) : value;
};

/**
 * Truncate text to a specified length, adding ellipsis if needed.
 */
export const truncateText = (value: string, limit = 160) => {
  if (!value) return value;
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
};
