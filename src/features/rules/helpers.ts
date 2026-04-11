export const getRuleDescriptionText = (value: unknown): string | null => {
  const description = (value as { description?: unknown } | null | undefined)?.description;
  if (typeof description !== 'string' || description.length === 0) return null;
  return description;
};