import { createContext, useContext } from 'react';

export type PassphraseCtx = {
  passphrase: string | null;
  setPassphrase: (p: string | null, persist?: boolean) => void;
  notifyEncryptedDetected: () => void;
  clear: () => void;
};

export const PassphraseContext = createContext<PassphraseCtx | null>(null);

export const useAssessmentPassphrase = (): PassphraseCtx => {
  const ctx = useContext(PassphraseContext);
  if (!ctx) throw new Error('useAssessmentPassphrase must be used inside AssessmentPassphraseProvider');
  return ctx;
};
