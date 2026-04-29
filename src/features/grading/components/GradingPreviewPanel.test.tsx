import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
          <GradingPreviewPanel items={[]} loading status="running" />
        </PassphraseContext.Provider>
      </MantineProvider>,
    );

    expect(screen.getByText('Preview job running.')).toBeInTheDocument();
  });
});
