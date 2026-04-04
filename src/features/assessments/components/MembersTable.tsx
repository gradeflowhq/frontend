import { Button, Group, Select, Text, Center, Stack } from '@mantine/core';
import { IconDeviceFloppy, IconPencil, IconTrash, IconUsers } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useState } from 'react';

import type { UserResponse, UserResponseRole } from '@api/models';

type MembersTableProps = {
  items: UserResponse[];
  onSetRole: (userId: string, role: UserResponseRole) => Promise<void> | void;
  onRemove: (userId: string) => void;
  initialPageSize?: number;
  isLoading?: boolean;
};

const MembersTable: React.FC<MembersTableProps> = ({
  items = [],
  onSetRole,
  onRemove,
  initialPageSize = 10,
  isLoading = false,
}) => {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<UserResponseRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = initialPageSize;

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

  if (!isLoading && (!Array.isArray(items) || items.length === 0)) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <IconUsers size={32} opacity={0.4} />
          <Text c="dimmed">No members</Text>
          <Text size="sm" c="dimmed">Add members using the input above.</Text>
        </Stack>
      </Center>
    );
  }

  const records = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DataTable
      columns={[
        {
          accessor: 'name',
          title: 'Name',
          render: (row) => row.name ?? <Text c="dimmed" span>—</Text>,
        },
        {
          accessor: 'email',
          title: 'Email',
          render: (row) => <Text ff="monospace" size="xs">{row.email}</Text>,
        },
        {
          accessor: 'role',
          title: 'Role',
          render: (row) => {
            const isEditing = editingUserId === row.id;
            if (!isEditing) return <Text size="sm">{row.role}</Text>;
            return (
              <Select
                size="sm"
                data={['owner', 'editor', 'viewer']}
                value={pendingRole ?? row.role}
                onChange={(v) => setPendingRole((v ?? 'viewer') as UserResponseRole)}
                w={140}
              />
            );
          },
        },
        {
          accessor: 'actions',
          title: 'Actions',
          render: (row) => {
            const isEditing = editingUserId === row.id;
            if (!isEditing) {
              return (
                <Group gap="xs">
                  <Button size="xs" variant="outline" leftSection={<IconPencil size={12} />} onClick={() => beginEdit(row)}>
                    Edit Role
                  </Button>
                  <Button size="xs" color="red" variant="outline" leftSection={<IconTrash size={12} />} onClick={() => onRemove(row.id)}>
                    Remove
                  </Button>
                </Group>
              );
            }
            return (
              <Group gap="xs">
                <Button size="xs" leftSection={<IconDeviceFloppy size={12} />} loading={saving} onClick={() => void saveEdit(row)}>
                  Save
                </Button>
                <Button size="xs" variant="subtle" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </Group>
            );
          },
        },
      ]}
      records={records}
      totalRecords={items.length}
      recordsPerPage={PAGE_SIZE}
      page={page}
      onPageChange={setPage}
      fetching={isLoading}
      striped
      highlightOnHover
    />
  );
};

export default MembersTable;
