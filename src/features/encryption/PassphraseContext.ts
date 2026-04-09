import { createContext, useContext } from 'react';

export type PassphraseContextValue = {
  passphrase: string | null;
  setPassphrase: (p: string | null, persist?: boolean) => void;
  notifyEncryptedDetected: () => void;
  clear: () => void;
};

export const PassphraseContext = createContext<PassphraseContextValue | null>(null);

PassphraseContext.displayName = 'PassphraseContext';

export const useAssessmentPassphrase = (): PassphraseContextValue => {
  const ctx = useContext(PassphraseContext);
  if (!ctx) throw new Error('useAssessmentPassphrase must be used inside AssessmentPassphraseProvider');
  return ctx;
};
