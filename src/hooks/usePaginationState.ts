import { useState } from 'react';

export type PaginationState = { pageIndex: number; pageSize: number };

export const usePaginationState = (
  initial: PaginationState = { pageIndex: 0, pageSize: 10 }
) => {
  const [state, setState] = useState<PaginationState>(initial);

  const setPageIndex = (pageIndex: number) =>
    setState((s) => ({ ...s, pageIndex }));

  const setPageSize = (pageSize: number) =>
    setState(() => ({ pageIndex: 0, pageSize }));

  return { pagination: state, setPagination: setState, setPageIndex, setPageSize };
};