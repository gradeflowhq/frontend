import React, { useMemo, useState, useEffect } from 'react';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import { IconChevronLeft, IconChevronRight } from '@components/ui/Icon';
import {
  useSourceData, useImportConfig, useSaveImportConfig, useImportSubmissions,
} from '@features/submissions';
import { useInferAndParseQuestionSet, useQuestionSet } from '@features/questions/hooks';
import { useToast } from '@components/common/ToastProvider';

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

  const toast = useToast();
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
                onError: () => toast.error('Could not auto-infer question set'),
              });
            }
            onSuccess();
          },
          onError: () => toast.error('Import failed'),
        });
      },
      onError: () => toast.error('Failed to save configuration'),
    });
  };

  if (sourceLoading || sourceFetching) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (sourceError || !sourceData) {
    return (
      <ErrorAlert
        error={new Error('Source data not found. Please upload a file first.')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-70">
        Choose which columns to import as answer data and optionally map pre-grade point columns.
        This configuration is saved and can be changed later without re-uploading.
      </p>

      <div className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xs">
        <div className="overflow-x-auto">
          <table className="table table-sm table-zebra w-full">
            <thead className="sticky top-0 bg-base-100">
              <tr>
                <th>Include</th>
                <th>Column</th>
                <th>Sample values</th>
                <th>Pre-grade points from</th>
              </tr>
            </thead>
            <tbody>
              {allDataCols.map((col) => {
                const colIdx = sourceData.headers.indexOf(col);
                const samples = sourceData.rows.slice(0, 3).map((r) => r[colIdx] ?? '').filter(Boolean);
                const isSelected = selectedCols.includes(col);
                const pointChoices = getPointChoices(col);
                return (
                  <tr key={col} className="hover">
                    <td>
                      <input
                        type="checkbox" className="checkbox checkbox-sm"
                        checked={isSelected}
                        onChange={() => toggleCol(col)}
                      />
                    </td>
                    <td><span className="font-mono text-sm">{col}</span></td>
                    <td><span className="font-mono text-xs opacity-70">{samples.join(' · ')}</span></td>
                    <td>
                      {isSelected ? (
                        <select
                          className="select select-bordered select-xs w-full max-w-[14rem]"
                          value={pointColumns[col] ?? ''}
                          onChange={(e) => setPointCol(col, e.target.value)}
                        >
                          <option value="">(none)</option>
                          {pointChoices.map((pc) => (
                            <option key={pc} value={pc}>{pc}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs opacity-40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(saveConfig.isError || importMutation.isError) && (
        <ErrorAlert error={saveConfig.error ?? importMutation.error} />
      )}

      <div className="flex justify-between mt-6">
        <Button
          type="button" variant="ghost" onClick={onBack}
          disabled={isPending} leftIcon={<IconChevronLeft />}
        >
          Back
        </Button>
        <LoadingButton
          type="button" variant="primary" onClick={handleNext}
          disabled={selectedCols.length === 0} isLoading={isPending}
          leftIcon={<IconChevronRight />}
        >
          Next
        </LoadingButton>
      </div>
    </div>
  );
};
