import { flexRender } from '@tanstack/react-table';

import TableSkeleton from '@components/common/TableSkeleton';
import PaginationControls from '@components/ui/PaginationControls';

import type { Cell, Column, Header, HeaderGroup, Row, Table } from '@tanstack/react-table';

type TableShellProps<TData = unknown> = {
  table: Table<TData>;            // TanStack table instance
  totalItems: number;             // total rows before pagination
  className?: string;
  showZebra?: boolean;
  headerSticky?: boolean;
  paddingClassName?: string;      // optional padding for controls
  pinnedColumns?: string[];       // columns to pin (by header or id)
  dense?: boolean;                // use table-sm sizing
  isLoading?: boolean;            // render skeleton rows when loading
  skeletonRowCount?: number;
};

const TableShell = <TData,>({
  table,
  totalItems,
  className,
  showZebra = true,
  headerSticky = true,
  paddingClassName = 'px-3 py-2',
  pinnedColumns = [],
  dense = true,
  isLoading = false,
  skeletonRowCount = 6,
}: TableShellProps<TData>) => {
  const columnsCount = table.getVisibleFlatColumns().length || 4;

  if (isLoading) {
    return <TableSkeleton cols={columnsCount} rows={skeletonRowCount} className={className} />;
  }

  const pageIndex = table.getState().pagination?.pageIndex ?? 0;
  const pageSize = table.getState().pagination?.pageSize ?? 10;
  const pageRows = table.getRowModel().rows;

  const enablePinning = pinnedColumns.length > 0;

  const isPinned = (column: Column<TData, unknown>) => {
    if (!enablePinning) return false;
    const header = column.columnDef.header;
    const id = column.id;
    const headerLabel = typeof header === 'string' ? header : undefined;
    return (headerLabel ? pinnedColumns.includes(headerLabel) : false) || pinnedColumns.includes(id);
  };

  return (
    <div
      className={`overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xs ${
        className ?? ''
      }`}
    >
      <div className="overflow-x-auto">
        <table
          className={`table ${dense ? 'table-sm' : ''} ${showZebra ? 'table-zebra' : ''} ${
            enablePinning ? 'table-pin-cols' : ''
          } w-full`}
        >
          <thead className={headerSticky ? 'sticky top-0 bg-base-100' : ''}>
            {table.getHeaderGroups().map((hg: HeaderGroup<TData>) => (
              <tr key={hg.id}>
                {hg.headers.map((h: Header<TData, unknown>) => {
                  const pinned = isPinned(h.column);
                  const Component = enablePinning ? (pinned ? 'th' : 'td') : 'th';
                  return (
                    <Component
                      key={h.id}
                      className={!pinned && enablePinning ? 'font-bold' : ''}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </Component>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.map((row: Row<TData>) => (
              <tr key={row.id} className="hover">
                {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
                  const pinned = isPinned(cell.column);
                  const Component = enablePinning && pinned ? 'th' : 'td';
                  return (
                    <Component key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Component>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageIndexChange={(pi) => table.setPageIndex(pi)}
        onPageSizeChange={(ps) => table.setPageSize(ps)}
        className={paddingClassName}
      />
    </div>
  );
};

export default TableShell;