import React, { useCallback, useMemo, useState } from 'react';
import EncryptedDataGuard from '@components/common/encryptions/EncryptedDataGuard';
import { buildPassphraseKey, readPassphrase, normalizePresent, writePassphrase } from '@utils/passphrase';
import { startCryptoSession } from '@utils/crypto';
import { PassphraseContext, type PassphraseCtx } from './passphraseContext';

export const AssessmentPassphraseProvider: React.FC<{ assessmentId: string; children: React.ReactNode }> = ({ assessmentId, children }) => {
  const storageKey = buildPassphraseKey(assessmentId);

  const [passphrase, setPassphraseState] = useState<string | null>(() => readPassphrase(storageKey));
  const [encryptedDetected, setEncryptedDetected] = useState(false);

  const setPassphrase = useCallback((p: string | null, persist?: boolean) => {
    const norm = normalizePresent(p);
    setPassphraseState(norm);
    if (persist && norm) writePassphrase(storageKey, norm);
  }, [storageKey]);

  const notifyEncryptedDetected = useCallback(() => {
    setEncryptedDetected(true);
  }, []);

  const clear = useCallback(() => {
    setPassphraseState(null);
  }, []);

  const onPassphraseReady = useCallback((p: string | null, persist = false) => {
    setPassphrase(p, persist);
    if (p) {
      // Initialize the crypto session so first decrypt is fast
      startCryptoSession(p).catch(() => {});
    }
  }, [setPassphrase]);

  const guardOpen = encryptedDetected && !normalizePresent(passphrase);

  const ctx = useMemo<PassphraseCtx>(() => ({
    passphrase,
    setPassphrase,
    notifyEncryptedDetected,
    clear,
  }), [passphrase, setPassphrase, notifyEncryptedDetected, clear]);

  return (
    <PassphraseContext.Provider value={ctx}>
      {children}
      {guardOpen && (
        <EncryptedDataGuard
          storageKey={storageKey}
          encryptedDetected={true}
          onPassphraseReady={onPassphraseReady}
          currentPassphrase={passphrase}
        />
      )}
    </PassphraseContext.Provider>
  );
};