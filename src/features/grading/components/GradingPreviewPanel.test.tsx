import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JobStatusResponseStatus as JobStatus } from '@api/models/jobStatusResponseStatus';
import { PassphraseContext } from '@features/encryption/PassphraseContext';

import GradingPreviewPanel from './GradingPreviewPanel';

describe('GradingPreviewPanel', () => {
  it('shows preview job status while loading', () => {
    render(
      <MantineProvider>
        <PassphraseContext.Provider
          value={{
            passphrase: null,
            setPassphrase: () => {},
            notifyEncryptedDetected: () => {},
            clear: () => {},
          }}
        >
          <GradingPreviewPanel items={[]} loading status={JobStatus.running} />
        </PassphraseContext.Provider>
      </MantineProvider>,
    );

    expect(screen.getByText('Preview job running')).toBeInTheDocument();
  });

  it('shows when preview takes longer than expected', () => {
    render(
      <MantineProvider>
        <PassphraseContext.Provider
          value={{
            passphrase: null,
            setPassphrase: () => {},
            notifyEncryptedDetected: () => {},
            clear: () => {},
          }}
        >
          <GradingPreviewPanel
            items={[]}
            loading
            status={JobStatus.running}
            progress={{ percent: 100, overdue: true, remainingMs: 0 }}
          />
        </PassphraseContext.Provider>
      </MantineProvider>,
    );

    expect(screen.getByText(/Taking longer than expected/)).toBeInTheDocument();
  });
});
