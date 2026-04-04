import { Tabs, Badge, Text, Stack } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import React, { useState } from 'react';

import { formatNumericValue, truncateText } from '@utils/format';

import { InfoRow, LoadingBadge } from './InfoRow';
import { type PreparedRow, type PreviewTab } from '../types';

type PreviewSectionProps = {
  mappedRows: PreparedRow[];
  unmappedRows: PreparedRow[];
  previewTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  loadingCourseData: boolean;
  gradeMode: 'points' | 'percent';
};

const PreviewSection: React.FC<PreviewSectionProps> = ({
  mappedRows,
  unmappedRows,
  previewTab,
  onTabChange,
  loadingCourseData,
  gradeMode,
}) => {
  const [mappedPage, setMappedPage] = useState(1);
  const [unmappedPage, setUnmappedPage] = useState(1);
  const PAGE_SIZE = 5;

  const renderScoreCell = (primary?: number | null, secondary?: number | null) => {
    const formattedPrimary = formatNumericValue(primary);
    const formattedSecondary = formatNumericValue(secondary);
    const displayPrimary = formattedPrimary ?? '\u2014';
    return (
      <Stack gap={2}>
        <Text ff="monospace" size="xs">{displayPrimary}</Text>
        {formattedSecondary !== undefined && formattedSecondary !== null && formattedSecondary !== formattedPrimary && (
          <Text size="xs" c="dimmed">Original: {formattedSecondary}</Text>
        )}
      </Stack>
    );
  };

  const columns = [
    {
      accessor: 'decryptedStudentId',
      title: 'Student ID',
      render: (row: PreparedRow) => <Text ff="monospace" size="xs">{row.decryptedStudentId || '\u2014'}</Text>,
    },
    {
      accessor: 'studentName',
      title: 'Name',
      render: (row: PreparedRow) => row.studentName || '\u2014',
    },
    {
      accessor: 'points',
      title: (
        <span>
          Points {gradeMode === 'points' && <Badge size="xs" color="blue">Used</Badge>}
        </span>
      ),
      render: (row: PreparedRow) => renderScoreCell(row.selectedPoints, row.originalPoints),
    },
    {
      accessor: 'percent',
      title: (
        <span>
          Percent {gradeMode === 'percent' && <Badge size="xs" color="blue">Used</Badge>}
        </span>
      ),
      render: (row: PreparedRow) => renderScoreCell(row.selectedPercent, row.originalPercent),
    },
    {
      accessor: 'comments',
      title: 'Comments',
      render: (row: PreparedRow) => (
        <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
          {truncateText(row.comments ?? '', 130) || '\u2014'}
        </Text>
      ),
    },
  ];

  const activeRows = previewTab === 'mapped' ? mappedRows : unmappedRows;
  const activePage = previewTab === 'mapped' ? mappedPage : unmappedPage;
  const setPage = previewTab === 'mapped' ? setMappedPage : setUnmappedPage;
  const records = activeRows.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  return (
    <InfoRow
      title="Preview"
      description="Mapped and unmapped students."
      action={loadingCourseData ? <LoadingBadge label="Loading data" /> : undefined}
    >
      <Tabs value={previewTab} onChange={(v) => onTabChange(v as PreviewTab)}>
        <Tabs.List>
          <Tabs.Tab value="mapped">Mapped ({mappedRows.length})</Tabs.Tab>
          <Tabs.Tab value="unmapped">Unmapped ({unmappedRows.length})</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <DataTable
        columns={columns}
        records={records}
        totalRecords={activeRows.length}
        recordsPerPage={PAGE_SIZE}
        page={activePage}
        onPageChange={setPage}
        striped
        highlightOnHover
        pinFirstColumn
      />

      <Text size="sm" c="dimmed">
        {mappedRows.length} mapped / {unmappedRows.length} unmapped students.
      </Text>
    </InfoRow>
  );
};

export default PreviewSection;
