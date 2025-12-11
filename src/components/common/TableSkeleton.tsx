import clsx from 'clsx';
import React from 'react';

export type TableSkeletonProps = {
  cols: number;
  rows?: number;
  className?: string;
  withHeader?: boolean;
  dense?: boolean;
};

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  cols,
  rows = 6,
  className,
  withHeader = true,
  dense = true,
}) => {
  const colArray = Array.from({ length: cols });
  const rowArray = Array.from({ length: rows });

  return (
    <div className={clsx('overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xs', className)}>
      <div className="overflow-x-auto">
        <table className={clsx('table w-full', dense && 'table-sm')}>
          {withHeader && (
            <thead className="sticky top-0 bg-base-100">
              <tr>
                {colArray.map((_, idx) => (
                  <th key={`h-${idx}`}>
                    <div className="skeleton h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rowArray.map((_, rIdx) => (
              <tr key={`r-${rIdx}`}>
                {colArray.map((_, cIdx) => (
                  <td key={`c-${rIdx}-${cIdx}`}>
                    <div className="skeleton h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSkeleton;
