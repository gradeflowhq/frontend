import { flexRender } from '@tanstack/react-table';
import PaginationControls from '@components/ui/PaginationControls';

type TableShellProps = {
  table: any;                     // TanStack table instance
  totalItems: number;             // total rows before pagination
  className?: string;
  showZebra?: boolean;
  headerSticky?: boolean;
  paddingClassName?: string;      // optional padding for controls
};

const TableShell = ({
  table,
  totalItems,
  className,
  showZebra = true,
  headerSticky = true,
  paddingClassName = 'px-3 py-2',
}: TableShellProps) => {
  const pageIndex = table.getState().pagination?.pageIndex ?? 0;
  const pageSize = table.getState().pagination?.pageSize ?? 10;
  const pageRows = table.getRowModel().rows;

  return (
    <div className={`overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xs ${className ?? ''}`}>
      <div className="overflow-x-auto">
        <table className={`table ${showZebra ? 'table-zebra' : ''} w-full`}>
          <thead className={headerSticky ? 'sticky top-0 bg-base-100' : ''}>
            {table.getHeaderGroups().map((hg: any) => (
              <tr key={hg.id}>
                {hg.headers.map((h: any) => (
                  <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.map((row: any) => (
              <tr key={row.id} className="hover">
                {row.getVisibleCells().map((cell: any) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
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