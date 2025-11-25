import React, { useState } from 'react';
import { IconChevronDown, IconDownload } from '@components/ui/Icon';
import LoadingButton from '@components/ui/LoadingButton';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import { useQuery } from '@tanstack/react-query';
import { api } from '@api';
import { useExportGrading } from '@features/grading/hooks';
import { tryDecodeExportCsv } from '@features/submissions/helpers';
import { useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';
import type { GradingExportRequest, GradingExportResponse } from '@api/models';

type ResultsExportMenuProps = {
  assessmentId: string;
  disabled?: boolean;
  className?: string;
  onError?: (e: unknown) => void;
  label?: string;
};

const ResultsExportMenu: React.FC<ResultsExportMenuProps> = ({
  assessmentId,
  disabled,
  className,
  onError,
  label = 'Export',
}) => {
  const [pendingSaver, setPendingSaver] = useState<string | null>(null);
  const { passphrase } = useAssessmentPassphrase();

  // Available savers (fallback to CSV)
  const { data: saversRes } = useQuery({
    queryKey: ['registry', 'submissionsSavers'],
    queryFn: async () => (await api.submissionsSaversRegistrySubmissionsSaversGet()).data as string[],
    staleTime: 5 * 60 * 1000,
  });
  const savers = Array.isArray(saversRes) && saversRes.length > 0 ? saversRes : ['CSV'];

  const exportMutation = useExportGrading(assessmentId);

  const isPending = exportMutation.isPending;
  const btnDisabled = disabled || isPending;

  const handleExport = (saver: string) => {
    if (btnDisabled) return;
    setPendingSaver(saver);

    const payload: GradingExportRequest = { saver_name: saver as any, submissions_saver_kwargs: {} };
    exportMutation.mutate(payload, {
      onSuccess: async (data: GradingExportResponse) => {
        try {
          const maybeDecoded = await tryDecodeExportCsv(data.data, { passphrase });

          const extension = data.extension || 'csv';
          const filename = data.filename || `grading.${extension}`;
          const mime = extension.toLowerCase() === 'csv' ? 'text/csv;charset=utf-8' : 'application/octet-stream';
          const blob = new Blob([maybeDecoded], { type: mime });

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (e) {
          onError?.(e);
        } finally {
          setPendingSaver(null);
        }
      },
      onError: (e) => {
        setPendingSaver(null);
        onError?.(e);
      },
    });
  };

  return (
    <DropdownMenu
      align="end"
      className={className}
      trigger={
        isPending ? `Exporting ${pendingSaver ?? ''}…` : (
          <>
            <IconDownload />
            {label}
            <IconChevronDown />
          </>
        )
      }
    >
      <>
        {savers.map((saver) => (
          <li key={saver}>
            <LoadingButton
              variant="ghost"
              className="justify-start"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleExport(saver)}
              disabled={btnDisabled}
              isLoading={isPending && pendingSaver === saver}
              title={`Export as ${saver}`}
            >
              {saver}
            </LoadingButton>
          </li>
        ))}
      </>
    </DropdownMenu>
  );
};

export default ResultsExportMenu;