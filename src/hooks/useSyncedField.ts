import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Mirrors an external value into local state, keeping the two in sync whenever
 * the external value changes (e.g. when async data arrives).
 *
 * Usage:
 * ```tsx
 * const [name, setName] = useSyncedField(assessment?.name ?? '');
 * ```
 */
export function useSyncedField<T>(externalValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(externalValue);

  useEffect(() => {
    setValue(externalValue);
  }, [externalValue]);

  return [value, setValue];
}
