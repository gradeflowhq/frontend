import {
  Alert, Button, Checkbox, Group, Select, Skeleton, Stack, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useMemo, useState, useEffect } from 'react';

import { useInferAndParseQuestionSet, useQuestionSet } from '@features/questions/api';
import {
  useSourceData, useImportConfig, useSaveImportConfig, useImportSubmissions,
} from '@features/submissions';
import { getErrorMessage } from '@utils/error';

import type { SubmissionsImportConfig } from '@api/models';

export const ConfigureStep: React.FC<{
  assessmentId: string;
  onSuccess: () => void;
  onBack: () => void;
}> = ({ assessmentId, onSuccess, onBack }) => {
  const {
    data: sourceData,
    isLoading: sourceLoading,
    isFetching: sourceFetching,
    isError: sourceError,
  } = useSourceData(assessmentId);

  const { data: existingConfig, isError: configError } = useImportConfig(assessmentId);

  const sidCol = sourceData?.student_id_column ?? 'student_id';
  const allDataCols = useMemo(
    () => (sourceData?.headers ?? []).filter((h) => h !== sidCol),
    [sourceData, sidCol],
  );

  const [initialized, setInitialized] = useState(false);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [pointColumns, setPointColumns] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialized || sourceFetching || !sourceData) return;
    if (existingConfig === undefined && !configError) return;

    const validSelected = existingConfig?.answer_columns
      ? existingConfig.answer_columns.filter((c) => allDataCols.includes(c))
      : allDataCols;
    setSelectedCols(validSelected);

    const validPointCols: Record<string, string> = {};
    for (const [ansCol, ptsCol] of Object.entries(existingConfig?.point_columns ?? {})) {
      if (allDataCols.includes(ansCol) && sourceData.headers.includes(ptsCol) && ptsCol !== sidCol) {
        validPointCols[ansCol] = ptsCol;
      }
    }
    setPointColumns(validPointCols);
    setInitialized(true);
  }, [initialized, sourceFetching, sourceData, existingConfig, configError, allDataCols, sidCol]);

  const saveConfig = useSaveImportConfig(assessmentId);
  const importMutation = useImportSubmissions(assessmentId);
  const inferAndParse = useInferAndParseQuestionSet(assessmentId);
  const { data: qsRes } = useQuestionSet(assessmentId, true);

  const isPending = saveConfig.isPending || importMutation.isPending;

  const toggleCol = (col: string) => {
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
    setPointColumns((prev) => {
      if (!(col in prev)) return prev;
      const next = { ...prev };
      delete next[col];
      return next;
    });
  };

  const allUsedPointCols = useMemo(() => new Set(Object.values(pointColumns)), [pointColumns]);

  const setPointCol = (answerCol: string, pointsCol: string) => {
    setPointColumns((prev) => {
      if (pointsCol === '') {
        const next = { ...prev };
        delete next[answerCol];
        return next;
      }
      return { ...prev, [answerCol]: pointsCol };
    });
  };

  const getPointChoices = (forCol: string) =>
    (sourceData?.headers ?? []).filter(
      (h) =>
        h !== sidCol &&
        !selectedCols.includes(h) &&
        (pointColumns[forCol] === h || !allUsedPointCols.has(h)),
    );

  const handleNext = () => {
    const config: SubmissionsImportConfig = {
      answer_columns: selectedCols.length > 0 ? selectedCols : null,
      point_columns: Object.keys(pointColumns).length > 0 ? pointColumns : null,
    };
    saveConfig.mutate(config, {
      onSuccess: () => {
        importMutation.mutate(undefined, {
          onSuccess: () => {
            const hasQS =
              !!qsRes?.question_set &&
              Object.keys(qsRes.question_set.question_map ?? {}).length > 0;
            if (!hasQS) {
              inferAndParse.mutate(undefined, {
                onError: () => notifications.show({ color: 'red', message: 'Could not auto-infer question set' }),
              });
            }
            onSuccess();
          },
          onError: () => notifications.show({ color: 'red', message: 'Import failed' }),
        });
      },
      onError: () => notifications.show({ color: 'red', message: 'Failed to save configuration' }),
    });
  };

  if (sourceLoading || sourceFetching) {
    return (
      <Stack gap="sm">
        <Skeleton height={40} />
        <Skeleton height={200} />
      </Stack>
    );
  }

  if (sourceError || !sourceData) {
    return (
      <Alert color="red">Source data not found. Please upload a file first.</Alert>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Choose which columns to import as answer data and optionally map pre-grade point columns.
          This configuration is saved and can be changed later without re-uploading.
        </Text>
        <Group gap="xs" style={{ flexShrink: 0 }}>
          <Button size="xs" variant="default" onClick={() => setSelectedCols(allDataCols)}>Select all</Button>
          <Button size="xs" variant="default" onClick={() => setSelectedCols([])}>Deselect all</Button>
        </Group>
      </Group>

      <DataTable
        columns={[
          {
            accessor: 'include',
            title: 'Include',
            render: (row) => (
              <Checkbox
                size="sm"
                checked={selectedCols.includes(row.col)}
                onChange={() => toggleCol(row.col)}
              />
            ),
          },
          {
            accessor: 'column',
            title: 'Column',
            render: (row) => (
              <Text ff="monospace" size="sm">{row.col}</Text>
            ),
          },
          {
            accessor: 'samples',
            title: 'Sample values',
            render: (row) => (
              <Text ff="monospace" size="xs" c="dimmed">{row.samples.join(' · ')}</Text>
            ),
          },
          {
            accessor: 'points',
            title: 'Pre-grade points from',
            render: (row) => {
              const isSelected = selectedCols.includes(row.col);
              return isSelected ? (
                <Select
                  size="xs"
                  w={224}
                  placeholder="(none)"
                  clearable
                  value={pointColumns[row.col] ?? null}
                  onChange={(v) => setPointCol(row.col, v ?? '')}
                  data={row.pointChoices.map((pc) => ({ value: pc, label: pc }))}
                />
              ) : (
                <Text size="xs" c="dimmed">—</Text>
              );
            },
          },
        ]}
        records={allDataCols.map((col) => {
          const colIdx = sourceData.headers.indexOf(col);
          const samples = sourceData.rows.slice(0, 3).map((r) => r[colIdx] ?? '').filter(Boolean);
          return { col, samples, pointChoices: getPointChoices(col) };
        })}
        idAccessor="col"
        striped
        highlightOnHover
      />

      {(saveConfig.isError || importMutation.isError) && (
        <Alert color="red">{getErrorMessage(saveConfig.error ?? importMutation.error)}</Alert>
      )}

      <Group justify="space-between" mt="md">
        <Button
          type="button"
          variant="default"
          onClick={onBack}
          disabled={isPending}
          leftSection={<IconChevronLeft size={16} />}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={selectedCols.length === 0}
          loading={isPending}
          leftSection={<IconChevronRight size={16} />}
        >
          Next
        </Button>
      </Group>
    </Stack>
  );
};
