import { useEffect, useState } from 'react';

/**
 * Manages paginated table state with automatic page reset when filter/sort deps change.
 *
 * @param resetDeps - dependency list whose change triggers a reset to page 1
 * @param initialPageSize - initial number of rows per page (default 10)
 *
 * Usage:
 * ```tsx
 * const { page, setPage, pageSize, setPageSize, paginate } = usePagination(
 *   [searchQuery, sortStatus],
 *   initialPageSize,
 * );
 * const records = paginate(sortedRows);
 * ```
 */
export function usePagination(
  resetDeps: readonly unknown[],
  initialPageSize = 10,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset to page 1 whenever any of the tracked dependencies change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, resetDeps);

  function paginate<T>(items: T[]): T[] {
    return items.slice((page - 1) * pageSize, page * pageSize);
  }

  return { page, setPage, pageSize, setPageSize, paginate };
}
