import React, { useMemo, useState } from 'react';
import Modal from '@components/common/Modal';
import { Button } from '@components/ui/Button';
import { normalizePresent, readPassphrase } from '@utils/passphrase';

type Props = {
  storageKey: string;                         // e.g., submissions_passphrase:<assessmentId>
  encryptedDetected: boolean;                 // whether page contains encrypted data
  onPassphraseReady: (passphrase: string | null, persist?: boolean) => void;
  currentPassphrase?: string | null;          // optional: parent-provided passphrase state
};

const EncryptedDataGuard: React.FC<Props> = ({
  storageKey,
  encryptedDetected,
  onPassphraseReady,
  currentPassphrase,
}) => {
  const [ignored, setIgnored] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [store, setStore] = useState(false);

  const effectivePassphrase = useMemo(
    () => normalizePresent(currentPassphrase ?? readPassphrase(storageKey)),
    [currentPassphrase, storageKey]
  );

  const open = encryptedDetected && !ignored && !effectivePassphrase;

  const handleUse = () => {
    const effective = normalizePresent(passphraseInput);
    if (!effective) return;
    onPassphraseReady(effective, store);
    setIgnored(true);
  };

  const handleIgnore = () => {
    onPassphraseReady(null, false);
    setIgnored(true);
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
          <div className="text-xs opacity-70">
            Stored in your browser’s local storage. Do not use on shared devices.
          </div>
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