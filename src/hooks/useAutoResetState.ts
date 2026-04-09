import { useEffect, useState } from 'react';

/**
 * Holds a piece of state that automatically resets to `null` after `delayMs`
 * milliseconds once it becomes non-null.
 *
 * Useful for transient highlight / flash states.
 *
 * Usage:
 * ```tsx
 * const [highlightedRule, setHighlightedRule] = useAutoResetState<RuleValue>(2000);
 * ```
 */
export function useAutoResetState<T>(delayMs: number): [T | null, (value: T | null) => void] {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (value === null) return;
    const timer = setTimeout(() => setValue(null), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return [value, setValue];
}
