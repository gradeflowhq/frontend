import { useEffect, useRef, useState } from 'react';

/**
 * Tracks the pixel width of a container element using a ResizeObserver.
 *
 * Usage:
 * ```tsx
 * const { ref, width } = useContainerWidth<HTMLDivElement>();
 * return <div ref={ref}>...</div>;
 * ```
 */
export function useContainerWidth<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });

    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);

    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
