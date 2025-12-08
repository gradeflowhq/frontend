import React, { useMemo } from 'react';
import { Button } from '@components/ui/Button';
import { IconEdit, IconTrash, IconInbox } from '@components/ui/Icon';
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import TableShell from '@components/common/TableShell';
import { formatAbsolute, formatSmart } from '@utils/datetime';
import { usePaginationState } from '@hooks/usePaginationState';
import type { AssessmentResponse } from '@api/models';

type AssessmentsTableProps = {
  items: AssessmentResponse[];
  onOpen: (item: AssessmentResponse) => void;
  onEdit: (item: AssessmentResponse) => void;
  onDelete: (item: AssessmentResponse) => void;
  initialPageSize?: number;
};

const AssessmentsTable: React.FC<AssessmentsTableProps> = ({
  items,
  onOpen,
  onEdit,
  onDelete,
  initialPageSize = 10,
}) => {
  const columnHelper = createColumnHelper<AssessmentResponse>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row, getValue }) => (
          <Button
            variant="link"
            className="p-0 no-underline font-medium"
            onClick={() => onOpen(row.original)}
            title="Open assessment"
          >
            {getValue()}
          </Button>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => info.getValue() ?? <span className="opacity-60">—</span>,
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        cell: (info) => {
          const value = formatSmart(info.getValue(), { returnBoth: false });
          const display = typeof value === 'string' ? value : value.primary;
          return (
            <time className="font-mono text-xs" title={formatAbsolute(info.getValue(), { includeTime: true })}>
              {display}
            </time>
          );
        },
      }),
      columnHelper.accessor('updated_at', {
        header: 'Updated',
        cell: (info) => {
          const value = formatSmart(info.getValue(), { returnBoth: false });
          const display = typeof value === 'string' ? value : value.primary;
          return (
            <time className="font-mono text-xs" title={formatAbsolute(info.getValue(), { includeTime: true })}>
              {display}
            </time>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onEdit(item)} title="Edit" leftIcon={<IconEdit />}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="error"
                onClick={() => onDelete(item)}
                title="Delete"
                leftIcon={<IconTrash />}
              >
                Delete
              </Button>
            </div>
          );
        },
      }),
    ],
    [columnHelper, onOpen, onEdit, onDelete]
  );

  const { pagination, setPagination } = usePaginationState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data: items,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  if (items.length === 0) {
    return (
      <div className="hero rounded-box bg-base-200 py-12">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold flex items-center justify-center">
              <IconInbox />
              No assessments
            </h1>
            <p className="py-2 opacity-70">Create your first assessment using the “New Assessment” button above.</p>
          </div>
        </div>
      </div>
    );
  }

  // TableShell already renders header/body/pagination consistently
  return <TableShell table={table} totalItems={items.length} />;
};

export default AssessmentsTable;