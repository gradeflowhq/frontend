import { useEffect, useRef } from 'react';

/**
 * Returns a ref to attach to a list item element.
 * Whenever `dep` changes, scrolls the element into the nearest visible area.
 *
 * Usage:
 * ```tsx
 * const selectedRef = useScrollIntoView(selectedId);
 * // ...
 * <Box ref={isSelected ? selectedRef : undefined} ... />
 * ```
 */
export function useScrollIntoView<T extends HTMLElement = HTMLElement>(dep: unknown) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, [dep]);

  return ref;
}
