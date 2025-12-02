import React from 'react';
import { Button } from './Button';
import { IconChevronLeft, IconChevronRight } from './Icon';

type Props = {
  pageIndex: number;          // 0-based
  pageSize: number;
  totalItems: number;
  onPageIndexChange: (next: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

const PaginationControls: React.FC<Props> = ({
  pageIndex,
  pageSize,
  totalItems,
  onPageIndexChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}) => {
  const pageCount = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;
  const from = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(totalItems, (pageIndex + 1) * pageSize);

  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${className ?? ''}`}>
      <div className="text-sm opacity-70">
        Showing <span className="font-mono">{from}</span>–<span className="font-mono">{to}</span> of <span className="font-mono">{totalItems}</span>
      </div>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            className="select select-bordered select-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            title="Rows per page"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>
        )}

        <div className="join">
          <Button
            variant="default"
            className="join-item"
            size="sm"
            disabled={!canPrev}
            onClick={() => onPageIndexChange(0)}
            title="First page"
          >
            «
          </Button>
          <Button
            variant="default"
            className="join-item"
            size="sm"
            disabled={!canPrev}
            onClick={() => onPageIndexChange(pageIndex - 1)}
            title="Previous page"
            leftIcon={<IconChevronLeft />}
          />
          <Button
            variant="default"
            className="join-item"
            size="sm"
            title="Page info"
          >
            Page <span className="font-mono">{pageIndex + 1}</span> / <span className="font-mono">{pageCount}</span>
          </Button>
          <Button
            variant="default"
            className="join-item"
            size="sm"
            disabled={!canNext}
            onClick={() => onPageIndexChange(pageIndex + 1)}
            title="Next page"
            rightIcon={<IconChevronRight />}
          />
          <Button
            variant="default"
            className="join-item"
            size="sm"
            disabled={!canNext}
            onClick={() => onPageIndexChange(pageCount - 1)}
            title="Last page"
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;