import React, { useEffect, useState } from 'react';
import Modal from '../Modal';
import { Button } from '../../ui/Button';
import { normalizePresent, readPassphrase, writePassphrase } from '../../../utils/passphrase';

type Props = {
  storageKey: string;                         // e.g., submissions_passphrase:<assessmentId>
  encryptedDetected: boolean;                 // whether page contains encrypted data
  onPassphraseReady: (passphrase: string | null) => void;
  currentPassphrase?: string | null;          // optional: parent-provided passphrase state
};

const EncryptedDataGuard: React.FC<Props> = ({
  storageKey,
  encryptedDetected,
  onPassphraseReady,
  currentPassphrase,
}) => {
  const [open, setOpen] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [store, setStore] = useState(false);

  // Decide whether to open based on encryptedDetected and effective passphrase (from prop or storage)
  useEffect(() => {
    if (!encryptedDetected) return;

    const effective = normalizePresent(currentPassphrase ?? readPassphrase(storageKey));
    if (effective) {
      onPassphraseReady(effective);
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [encryptedDetected, storageKey, currentPassphrase, onPassphraseReady]);

  // If parent later loads a passphrase, close the guard
  useEffect(() => {
    const effective = normalizePresent(currentPassphrase ?? null);
    if (effective) setOpen(false);
  }, [currentPassphrase]);

  const handleUse = () => {
    const effective = normalizePresent(passphraseInput);
    if (!effective) return;
    if (store) writePassphrase(storageKey, effective);
    onPassphraseReady(effective);
    setOpen(false);
  };

  const handleIgnore = () => {
    onPassphraseReady(null);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleIgnore} boxClassName="w-full max-w-md">
      <h3 className="font-bold text-lg">Encrypted Data Detected</h3>
      <p className="mt-2">
        This page contains encrypted data. Enter a passphrase to decrypt student IDs, or ignore to view masked IDs.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <div>
          <label className="label"><span className="label-text">Passphrase</span></label>
          <input
            type="password"
            className="input input-bordered w-full"
            value={passphraseInput}
            onChange={(e) => setPassphraseInput(e.target.value)}
            placeholder="Enter passphrase"
          />
        </div>
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox"
              checked={store}
              onChange={(e) => setStore(e.target.checked)}
            />
            <span className="label-text">Store passphrase locally</span>
          </label>
          <span className="text-xs opacity-70 mt-1">
            Stored in your browser’s local storage. Do not use on shared devices.
          </span>
        </div>
      </div>
      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={handleIgnore}>
          Ignore
        </Button>
        <Button type="button" variant="primary" onClick={handleUse} disabled={!passphraseInput}>
          Use Passphrase
        </Button>
      </div>
    </Modal>
  );
};

export default EncryptedDataGuard;