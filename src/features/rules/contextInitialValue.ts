import type { RuleValue } from './types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const valueKey = (value: unknown): string => {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? '' : serialized;
};

export const mergeContextInitialValue = (
  current: RuleValue,
  previousInitial: RuleValue | null,
  nextInitial: RuleValue,
): RuleValue | null => {
  if (!isRecord(current) || !isRecord(nextInitial)) return null;

  const currentRecord = current as Record<string, unknown>;
  const previousRecord = isRecord(previousInitial)
    ? (previousInitial as Record<string, unknown>)
    : null;
  const next = { ...currentRecord };
  let changed = false;

  for (const [field, nextValue] of Object.entries(nextInitial)) {
    const currentHasField = Object.prototype.hasOwnProperty.call(currentRecord, field);
    const currentValue = currentRecord[field];
    const previousValue = previousRecord?.[field];

    if (!currentHasField) {
      next[field] = nextValue;
      changed = true;
      continue;
    }

    if (
      previousInitial &&
      valueKey(currentValue) === valueKey(previousValue) &&
      valueKey(currentValue) !== valueKey(nextValue)
    ) {
      next[field] = nextValue;
      changed = true;
    }
  }

  return changed ? (next as RuleValue) : null;
};
