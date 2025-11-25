import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import EncryptedDataGuard from '@components/common/encryptions/EncryptedDataGuard';
import { buildPassphraseKey, readPassphrase, normalizePresent, writePassphrase } from '@utils/passphrase';

type Ctx = {
  passphrase: string | null;
  setPassphrase: (p: string | null, persist?: boolean) => void;
  notifyEncryptedDetected: () => void;
  clear: () => void;
};

const PassphraseCtx = createContext<Ctx | null>(null);

export const AssessmentPassphraseProvider: React.FC<{ assessmentId: string; children: React.ReactNode }> = ({ assessmentId, children }) => {
  const storageKey = buildPassphraseKey(assessmentId);

  const [passphrase, setPassphraseState] = useState<string | null>(() => readPassphrase(storageKey));
  const [encryptedDetected, setEncryptedDetected] = useState(false);
  const [guardOpen, setGuardOpen] = useState(false);

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

  // Decide when to open the guard based on detection and current passphrase
  useEffect(() => {
    if (!encryptedDetected) return;
    if (normalizePresent(passphrase)) {
      setGuardOpen(false);
      return;
    }
    setGuardOpen(true);
  }, [encryptedDetected, passphrase]);

  const onPassphraseReady = useCallback((p: string | null) => {
    setPassphrase(p, true /* persist if user selected in UI */);
    setGuardOpen(false);
  }, [setPassphrase]);

  const ctx = useMemo<Ctx>(() => ({
    passphrase,
    setPassphrase,
    notifyEncryptedDetected,
    clear,
  }), [passphrase, setPassphrase, notifyEncryptedDetected, clear]);

  return (
    <PassphraseCtx.Provider value={ctx}>
      {children}
      {guardOpen && (
        <EncryptedDataGuard
          storageKey={storageKey}
          encryptedDetected={true}
          onPassphraseReady={onPassphraseReady}
          currentPassphrase={passphrase}
        />
      )}
    </PassphraseCtx.Provider>
  );
};

export const useAssessmentPassphrase = () => {
  const ctx = useContext(PassphraseCtx);
  if (!ctx) throw new Error('useAssessmentPassphrase must be used inside AssessmentPassphraseProvider');
  return ctx;
};