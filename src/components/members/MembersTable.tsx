import React, { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { UserResponse, UserResponseRole } from '../../api/models';

type MembersTableProps = {
  items: UserResponse[];
  onSetRole: (userId: string, role: UserResponseRole) => Promise<void> | void;
  onRemove: (userId: string) => void;
};

const MembersTable: React.FC<MembersTableProps> = ({ items = [], onSetRole, onRemove }) => {
  const [pendingRole, setPendingRole] = useState<Record<string, UserResponseRole>>({});

  const columnHelper = createColumnHelper<UserResponse>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => info.getValue() ?? <span className="opacity-60">—</span>,
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor('role', {
        header: 'Role',
        cell: ({ row }) => {
          const user = row.original;
          const userId = user.id;
          const current = pendingRole[userId] ?? user.role;
          return (
            <div className="flex items-center gap-2">
              <select
                className="select select-bordered select-sm"
                value={current}
                onChange={(e) => {
                  const role = e.target.value as UserResponseRole;
                  setPendingRole((prev) => ({ ...prev, [userId]: role }));
                }}
              >
                <option value="owner">owner</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
              <button
                className="btn btn-xs"
                onClick={() => onSetRole(userId, (pendingRole[userId] ?? user.role))}
              >
                Save
              </button>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex gap-2">
              <button className="btn btn-sm btn-error" onClick={() => onRemove(user.id)}>
                Remove
              </button>
            </div>
          );
        },
      }),
    ],
    [columnHelper, onSetRole, onRemove, pendingRole]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="hero rounded-box bg-base-200 py-12">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold">No members</h1>
            <p className="py-2 opacity-70">Add members using the input above.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box border border-base-300">
      <table className="table table-zebra w-full">
        <thead>
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
            <tr key={row.id}>
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

export default MembersTable;