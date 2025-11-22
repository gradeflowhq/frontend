import React, { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { AssessmentResponse } from '../../api/models';

type AssessmentsTableProps = {
  items: AssessmentResponse[];
  onOpen: (item: AssessmentResponse) => void;
  onEdit: (item: AssessmentResponse) => void;
  onDelete: (item: AssessmentResponse) => void;
};

const AssessmentsTable: React.FC<AssessmentsTableProps> = ({ items, onOpen, onEdit, onDelete }) => {
  const columnHelper = createColumnHelper<AssessmentResponse>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row, getValue }) => (
          <button
            className="btn btn-link p-0 no-underline font-medium"
            onClick={() => onOpen(row.original)}
            title="Open assessment"
          >
            {getValue()}
          </button>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => info.getValue() ?? <span className="opacity-60">—</span>,
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('updated_at', {
        header: 'Updated',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-sm" onClick={() => onEdit(item)} title="Edit">
                Edit
              </button>
              <button className="btn btn-sm btn-error" onClick={() => onDelete(item)} title="Delete">
                Delete
              </button>
            </div>
          );
        },
      }),
    ],
    [columnHelper, onOpen, onEdit, onDelete]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  if (items.length === 0) {
    return (
      <div className="hero rounded-box bg-base-200 py-12">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold">No assessments</h1>
            <p className="py-2 opacity-70">
              Create your first assessment using the “New Assessment” button above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 shadow-xs">
      <table className="table table-zebra w-full">
        <thead className="sticky top-0 bg-base-100">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssessmentsTable;