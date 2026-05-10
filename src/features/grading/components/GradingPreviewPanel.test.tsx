import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import { PassphraseContext } from '@features/encryption/PassphraseContext';

import GradingPreviewPanel from './GradingPreviewPanel';

import type { AdjustableSubmission } from '@features/grading/types';
import type { ReactElement, ReactNode } from 'react';

type MockColumn = {
  accessor: string;
  title: ReactNode;
  render?: (row: unknown) => ReactNode;
};

vi.mock('mantine-datatable', () => ({
  DataTable: ({ columns, records }: { columns: MockColumn[]; records: unknown[] }) => (
    <table>
      <thead>
        <tr>
          {columns.map((column) => <th key={column.accessor}>{column.title}</th>)}
        </tr>
      </thead>
      <tbody>
        {records.map((record, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => (
              <td key={column.accessor}>
                {column.render ? column.render(record) : null}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

describe('GradingPreviewPanel', () => {
  const renderPanel = (node: ReactElement) => render(
    <MantineProvider>
      <PassphraseContext.Provider
        value={{
          passphrase: null,
          setPassphrase: () => {},
          notifyEncryptedDetected: () => {},
          clear: () => {},
        }}
      >
        {node}
      </PassphraseContext.Provider>
    </MantineProvider>,
  );

  it('shows preview job status while loading', () => {
    renderPanel(<GradingPreviewPanel items={[]} loading status={JobStatus.running} />);

    expect(screen.getByText('Preview job running')).toBeInTheDocument();
  });

  it('shows when preview takes longer than expected', () => {
    renderPanel(
      <GradingPreviewPanel
        items={[]}
        loading
        status={JobStatus.running}
        progress={{ percent: 100, overdue: true, remainingMs: 0 }}
      />,
    );

    expect(screen.getByText(/Taking longer than expected/)).toBeInTheDocument();
  });

  it('renders answer-only preview columns from backend-provided question ids', () => {
    const items: AdjustableSubmission[] = [{
      student_id: 's1',
      answer_map: { q1: 'rules answer' },
      result_map: {},
    }];

    renderPanel(
      <GradingPreviewPanel
        items={items}
        answerQuestionIds={['q1']}
        resultQuestionIds={[]}
      />,
    );

    expect(screen.getByText('rules answer')).toBeInTheDocument();
    expect(screen.queryByText('Passed')).not.toBeInTheDocument();
  });
});
