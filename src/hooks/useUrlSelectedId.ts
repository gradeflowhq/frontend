import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Manages URL-driven selection of a string ID from a list.
 * Reads the given search param, validates it against the provided IDs array,
 * and initialises the param on first mount if absent.
 */
function useUrlSelectedId(
  ids: string[],
  paramName: string,
): { selectedId: string | null; setSelectedId: (id: string) => void } {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlId = searchParams.get(paramName);

  const selectedId = useMemo(() => {
    if (urlId && ids.includes(urlId)) return urlId;
    return ids[0] ?? null;
  }, [urlId, ids]);

  useEffect(() => {
    if (!urlId && ids.length > 0 && ids[0]) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(paramName, ids[0]!);
          return next;
        },
        { replace: true },
      );
    }
  }, [urlId, ids, paramName, setSearchParams]);

  const setSelectedId = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(paramName, id);
          return next;
        },
        { replace: true },
      );
    },
    [paramName, setSearchParams],
  );

  return { selectedId, setSelectedId };
}

export { useUrlSelectedId };
