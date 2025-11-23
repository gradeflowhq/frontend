import React, { useState } from 'react';
import { IconChevronDown, IconDownload } from '../ui/icons';
import { DropdownMenu } from '../ui/DropdownMenu';
import { Button } from '../ui/Button';
import { useMutation, useQuery } from '@tanstack/react-query';
import Papa from 'papaparse';
import { api } from '../../api';
import { isEncrypted, decryptString } from '../../utils/crypto';
import type { GradingExportRequest, GradingExportResponse } from '../../api/models';

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

  // Available savers (fallback to CSV)
  const { data: saversRes } = useQuery({
    queryKey: ['registry', 'submissionsSavers'],
    queryFn: async () => (await api.submissionsSaversRegistrySubmissionsSaversGet()).data as string[],
    staleTime: 5 * 60 * 1000,
  });
  const savers = Array.isArray(saversRes) && saversRes.length > 0 ? saversRes : ['CSV'];

  const exportMutation = useMutation({
    mutationKey: ['grading', assessmentId, 'export'],
    mutationFn: async (saver: string) => {
      const payload: GradingExportRequest = { saver_name: saver as any, submissions_saver_kwargs: {} };
      const res = await api.exportGradingAssessmentsAssessmentIdGradingExportPost(assessmentId, payload);
      return res.data as GradingExportResponse;
    },
    onSuccess: async (data) => {
      // Attempt client-side decoding of student_id using stored passphrase
      const storageKey = `submissions_passphrase:${assessmentId}`;
      const passphrase = localStorage.getItem(storageKey);

      let outputCsv = data.data;

      if (passphrase) {
        try {
          const parsed = Papa.parse<string[]>(data.data, { header: false, skipEmptyLines: true });
          const rows = parsed.data as unknown as string[][];
          if (rows.length > 1) {
            // Expect first row to include 'student_id'
            const headerRow = rows[0];
            const studentIdx = headerRow.findIndex((h) => String(h).trim().toLowerCase() === 'student_id');

            if (studentIdx >= 0) {
              const bodyRows = rows.slice(1);
              const decodedBody = await Promise.all(
                bodyRows.map(async (r) => {
                  const sid = r[studentIdx];
                  if (sid && isEncrypted(sid)) {
                    try {
                      const plain = await decryptString(sid, passphrase);
                      const next = [...r];
                      next[studentIdx] = plain;
                      return next;
                    } catch {
                      // If decryption fails, keep original
                      return r;
                    }
                  }
                  return r;
                })
              );

              const rebuilt = [headerRow, ...decodedBody];
              outputCsv = Papa.unparse(rebuilt);
            }
          }
        } catch (e) {
          // Parsing failed; fall back to original CSV
          console.warn('Export decode failed; using original CSV:', e);
        }
      }

      // Download (decoded if possible)
      const extension = data.extension || 'csv';
      const filename = data.filename || `grading.${extension}`;
      const mime = extension.toLowerCase() === 'csv' ? 'text/csv;charset=utf-8' : 'application/octet-stream';
      const blob = new Blob([outputCsv], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setPendingSaver(null);
    },
    onError: (e) => {
      setPendingSaver(null);
      onError?.(e);
    },
  });

  const isPending = exportMutation.isPending;
  const btnDisabled = disabled || isPending;

  const handleExport = (saver: string) => {
    if (btnDisabled) return;
    setPendingSaver(saver);
    exportMutation.mutate(saver);
  };
  

  return (
    <DropdownMenu align="end" className={className} trigger={isPending ? `Exporting ${pendingSaver ?? ''}…` : (
      <>
        <IconDownload />
        {label}
        <IconChevronDown />
      </>
    )}>
      <>
        {savers.map((saver) => (
          <li key={saver}>
            <Button
              variant="ghost"
              className="justify-start"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleExport(saver)}
              disabled={isPending}
              title={`Export as ${saver}`}
            >
              {saver}
              {pendingSaver === saver && isPending && (
                <span className="loading loading-spinner loading-xs ml-2" />
              )}
            </Button>
          </li>
        ))}
      </>
    </DropdownMenu>
  );
};

export default ResultsExportMenu;