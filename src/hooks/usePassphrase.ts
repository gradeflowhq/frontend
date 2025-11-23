import { useState } from 'react';
import { readPassphrase, writePassphrase } from '../utils/passphrase';

export const usePassphrase = (storageKey: string) => {
  const [passphrase, setPassphrase] = useState<string | null>(() => readPassphrase(storageKey));

  const savePassphrase = (value: string) => {
    writePassphrase(storageKey, value);
    setPassphrase(value);
  };

  return { passphrase, setPassphrase, savePassphrase };
};