import React, { useState } from 'react';
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
  titleWhenDisabled?: string;
};

const ResultsExportMenu: React.FC<ResultsExportMenuProps> = ({
  assessmentId,
  disabled,
  className,
  onError,
  label = 'Export',
  titleWhenDisabled = 'No grading results to export',
}) => {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
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

  const closeOnBlur = () => setTimeout(() => setOpen(false), 100);

  return (
    <div className={`dropdown dropdown-end ${open ? 'dropdown-open' : ''} ${className ?? ''}`}>
      <button
        tabIndex={0}
        className="btn btn-primary"
        onClick={() => setOpen((o) => !o)}
        onBlur={closeOnBlur}
        disabled={btnDisabled}
        title={btnDisabled && !isPending ? titleWhenDisabled : undefined}
      >
        {isPending ? `Exporting ${pendingSaver ?? ''}…` : label}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 opacity-80" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 z-50">
        {savers.map((saver) => (
          <li key={saver}>
            <button
              className="btn btn-ghost justify-start"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleExport(saver)}
              disabled={isPending}
              title={`Export as ${saver}`}
            >
              {saver}
              {pendingSaver === saver && isPending && (
                <span className="loading loading-spinner loading-xs ml-2" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResultsExportMenu;