import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { Button } from '../ui/Button';

type Props = {
  storageKey: string;              // e.g., submissions_passphrase:<assessmentId>
  encryptedDetected: boolean;      // whether page contains encrypted data
  onPassphraseReady: (passphrase: string | null) => void; // notify parent to use/hide
};

const EncryptedDataGuard: React.FC<Props> = ({ storageKey, encryptedDetected, onPassphraseReady }) => {
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [store, setStore] = useState(false);

  useEffect(() => {
    if (!encryptedDetected) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      onPassphraseReady(saved);
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [encryptedDetected, storageKey, onPassphraseReady]);

  const handleUse = () => {
    if (!passphrase) return;
    if (store) localStorage.setItem(storageKey, passphrase);
    onPassphraseReady(passphrase);
    setOpen(false);
  };

  const handleIgnore = () => {
    onPassphraseReady(null);
    setOpen(false);
  };

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
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
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
        <Button type="button" variant="primary" onClick={handleUse} disabled={!passphrase}>
          Use Passphrase
        </Button>
      </div>
    </Modal>
  );
};

export default EncryptedDataGuard;