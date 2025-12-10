import React, { useState } from 'react';

import Modal from '@components/common/Modal';
import { Button } from '@components/ui/Button';
import { IconAlertCircle, IconCheckCircle, IconSettings } from '@components/ui/Icon';
import LoadingButton from '@components/ui/LoadingButton';
import { createCanvasClient, normalizeCanvasBaseUrl, sanitizeCanvasBaseInput } from '@api/canvasClient';
import { useUserSettingsStore } from '@state/userSettingsStore';

import type { AxiosError } from 'axios';

type Props = {
  open: boolean;
  onClose: () => void;
};

type TestState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const UserSettingsDialog: React.FC<Props> = ({ open, onClose }) => {
  const { canvasBaseUrl, canvasToken, setCanvasBaseUrl, setCanvasToken } = useUserSettingsStore();
  const [testing, setTesting] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });

  const handleClose = () => {
    setTestState({ status: 'idle' });
    onClose();
  };

  const handleTestAuth = async () => {
    const normalizedBase = normalizeCanvasBaseUrl(canvasBaseUrl);
    if (!normalizedBase || !canvasToken) {
      setTestState({ status: 'error', message: 'Enter a Canvas base URL and token first.' });
      return;
    }

    setTesting(true);
    setTestState({ status: 'idle' });

    try {
      const client = createCanvasClient({ canvasBaseUrl: normalizedBase, token: canvasToken });
      const response = await client.getCurrentUser();

      const displayName =
        response.data?.name ?? response.data?.short_name ?? response.data?.sortable_name ?? 'your account';
      setTestState({ status: 'success', message: `Authenticated as ${displayName}.` });
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: string[]; message?: string }>;
      const detail = axiosErr.response?.data?.errors?.[0] ?? axiosErr.response?.data?.message;
      const message =
        detail ||
        axiosErr.message ||
        'Unable to reach Canvas via the CORS proxy. Confirm the URL and token.';
      setTestState({ status: 'error', message });
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} boxClassName="w-full max-w-2xl">
      <div className="flex items-center gap-2">
        <IconSettings className="w-5 h-5" />
        <h3 className="font-bold text-lg">User Settings</h3>
      </div>
      <p className="text-sm text-base-content/70 mt-1">Settings are stored locally in this browser.</p>

      <div className="mt-4 space-y-4">
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body gap-4">
            <div>
              <h4 className="font-semibold">Canvas Integration</h4>
              <p className="text-sm text-base-content/70">
                Connect GradeFlow to Canvas. Requests are proxied through a local proxy to avoid CORS issue. No data or credentials are stored.
              </p>
            </div>

            <label className="form-control w-full">
              <div className="label"><span className="label-text">Canvas Host URL</span></div>
              <input
                type="url"
                className="input input-bordered w-full"
                placeholder="https://school.instructure.com"
                value={canvasBaseUrl}
                onChange={(e) => setCanvasBaseUrl(sanitizeCanvasBaseInput(e.target.value))}
                autoComplete="url"
              />
              <div className="label">
                <span className="label-text-alt text-base-content/60">
                  Example: https://school.instructure.com (do not include /api or /api/v1).
                </span>
              </div>
            </label>

            <label className="form-control w-full">
              <div className="label"><span className="label-text">Canvas access token</span></div>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="Personal access token"
                value={canvasToken}
                onChange={(e) => setCanvasToken(e.target.value.trim())}
                autoComplete="off"
              />
              <div className="label">
                <span className="label-text-alt text-base-content/60">Stored only in this browser.</span>
              </div>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <LoadingButton
                type="button"
                variant="primary"
                onClick={() => void handleTestAuth()}
                isLoading={testing}
                loadingLabel="Checking..."
                idleLabel="Check"
              />

              {testState.status === 'success' && (
                <span className="flex items-center gap-1 text-sm text-success">
                  <IconCheckCircle className="w-4 h-4" />
                  {testState.message ?? 'Authentication succeeded.'}
                </span>
              )}

              {testState.status === 'error' && (
                <span className="flex items-center gap-1 text-sm text-error">
                  <IconAlertCircle className="w-4 h-4" />
                  {testState.message ?? 'Authentication failed.'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={handleClose}>Close</Button>
      </div>
    </Modal>
  );
};

export default UserSettingsDialog;
