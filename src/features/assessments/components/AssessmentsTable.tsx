import { Anchor, Button, Group, Text } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useState } from 'react';

import { formatAbsolute, formatSmart } from '@utils/datetime';

import type { AssessmentResponse } from '@api/models';

type AssessmentsTableProps = {
  items: AssessmentResponse[];
  onOpen: (item: AssessmentResponse) => void;
  onEdit: (item: AssessmentResponse) => void;
  onDelete: (item: AssessmentResponse) => void;
  initialPageSize?: number;
  isLoading?: boolean;
};

const AssessmentsTable: React.FC<AssessmentsTableProps> = ({
  items,
  onOpen,
  onEdit,
  onDelete,
  initialPageSize = 10,
  isLoading = false,
}) => {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = initialPageSize;
  const records = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DataTable
      columns={[
        {
          accessor: 'name',
          title: 'Name',
          render: (row) => (
            <Anchor component="button" onClick={() => onOpen(row)}>{row.name}</Anchor>
          ),
        },
        {
          accessor: 'description',
          title: 'Description',
          render: (row) => row.description ?? <Text c="dimmed" span>—</Text>,
        },
        {
          accessor: 'created_at',
          title: 'Created',
          render: (row) => {
            const val = formatSmart(row.created_at, { returnBoth: false });
            const display = typeof val === 'string' ? val : val.primary;
            return (
              <Text ff="monospace" size="xs" title={formatAbsolute(row.created_at, { includeTime: true })}>
                {display}
              </Text>
            );
          },
        },
        {
          accessor: 'updated_at',
          title: 'Updated',
          render: (row) => {
            const val = formatSmart(row.updated_at, { returnBoth: false });
            const display = typeof val === 'string' ? val : val.primary;
            return (
              <Text ff="monospace" size="xs" title={formatAbsolute(row.updated_at, { includeTime: true })}>
                {display}
              </Text>
            );
          },
        },
        {
          accessor: 'actions',
          title: 'Actions',
          render: (row) => (
            <Group gap="xs">
              <Button size="xs" leftSection={<IconPencil size={12} />} onClick={() => onEdit(row)}>Edit</Button>
              <Button size="xs" color="red" leftSection={<IconTrash size={12} />} onClick={() => onDelete(row)}>Delete</Button>
            </Group>
          ),
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

export default AssessmentsTable;
