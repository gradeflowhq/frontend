import React, { useMemo, useState } from 'react';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import { IconSave, IconTrash, IconInbox, IconEdit } from '@components/ui/Icon';
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import TableShell from '@components/common/TableShell';
import { usePaginationState } from '@hooks/usePaginationState';
import type { UserResponse, UserResponseRole } from '@api/models';

type MembersTableProps = {
  items: UserResponse[];
  onSetRole: (userId: string, role: UserResponseRole) => Promise<void> | void;
  onRemove: (userId: string) => void;
  initialPageSize?: number;
};

const MembersTable: React.FC<MembersTableProps> = ({
  items = [],
  onSetRole,
  onRemove,
  initialPageSize = 10,
}) => {
  // Track which row is being edited and the pending role for that row
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<UserResponseRole | null>(null);
  const [saving, setSaving] = useState(false);

  const beginEdit = (user: UserResponse) => {
    setEditingUserId(user.id);
    setPendingRole(user.role);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setPendingRole(null);
  };

  const saveEdit = async (user: UserResponse) => {
    if (pendingRole == null || pendingRole === user.role) {
      cancelEdit();
      return;
    }
    try {
      setSaving(true);
      await onSetRole(user.id, pendingRole);
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

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
          const isEditing = editingUserId === user.id;

          if (!isEditing) {
            return <span className="badge badge-ghost">{user.role}</span>;
          }

          return (
            <select
              className="select select-bordered select-sm"
              value={pendingRole ?? user.role}
              onChange={(e) => {
                const r = e.target.value as UserResponseRole;
                setPendingRole(r);
              }}
            >
              <option value="owner">owner</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original;
          const isEditing = editingUserId === user.id;

          if (!isEditing) {
            return (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => beginEdit(user)} leftIcon={<IconEdit />}>
                  Edit
                </Button>
                <Button size="sm" variant="error" onClick={() => onRemove(user.id)} leftIcon={<IconTrash />}>
                  Remove
                </Button>
              </div>
            );
          }

          return (
            <div className="flex gap-2">
              <LoadingButton
                size="sm"
                variant="primary"
                onClick={() => saveEdit(user)}
                leftIcon={<IconSave />}
                isLoading={saving}
              >
                Save
              </LoadingButton>
              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          );
        },
      }),
    ],
    [columnHelper, editingUserId, pendingRole, saving, onRemove]
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

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="hero rounded-box bg-base-200 py-12">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold flex items-center justify-center">
              <IconInbox />
              No members
            </h1>
            <p className="py-2 opacity-70">Add members using the input above.</p>
          </div>
        </div>
      </div>
    );
  }

  return <TableShell table={table} totalItems={items.length} />;
};

export default MembersTable;