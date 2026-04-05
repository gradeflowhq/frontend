import {
  Modal, Stack, Text, TextInput, PasswordInput, Button,
  Card, Group,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import React, { useState } from 'react';

import { createCanvasClient, parseCanvasBaseUrl } from '@api/canvasClient';
import { useUserSettingsStore } from '@state/userStore';

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
    const canvasUrl = parseCanvasBaseUrl(canvasBaseUrl);
    if (!canvasToken) {
      setTestState({ status: 'error', message: 'Enter a Canvas base URL and token first.' });
      return;
    }
    if (!canvasUrl) {
      setTestState({ status: 'error', message: 'Canvas URL must include the protocol (e.g. https://school.instructure.com).' });
      return;
    }

    setTesting(true);
    setTestState({ status: 'idle' });

    try {
      const client = createCanvasClient({ canvasBaseUrl: canvasUrl, token: canvasToken });
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

  return (
    <Modal opened={open} onClose={handleClose} title="User Settings" size="lg">
      <Text size="sm" c="dimmed" mb="md">Settings are stored locally in this browser.</Text>
      <Card withBorder>
        <Stack gap="md">
          <div>
            <Text fw={600}>Canvas Integration</Text>
            <Text size="sm" c="dimmed">
              Connect GradeFlow to Canvas. Requests are proxied through a local proxy to avoid
              CORS issues. No data or credentials are stored.
            </Text>
          </div>
          <TextInput
            label="Canvas Host URL"
            placeholder="https://school.instructure.com"
            value={canvasBaseUrl}
            onChange={(e) => setCanvasBaseUrl(e.currentTarget.value)}
            error={canvasBaseUrl && !parseCanvasBaseUrl(canvasBaseUrl)
              ? 'URL must start with https:// or http://'
              : undefined}
            description="Example: https://school.instructure.com (do not include /api or /api/v1)."
          />
          <PasswordInput
            label="Canvas access token"
            placeholder="Personal access token"
            value={canvasToken}
            onChange={(e) => setCanvasToken(e.currentTarget.value.trim())}
            description="Stored only in this browser."
          />
          <Group>
            <Button
              loading={testing}
              onClick={() => void handleTestAuth()}
            >
              {testing ? 'Checking...' : 'Check'}
            </Button>
            {testState.status === 'success' && (
              <Group gap={4}>
                <IconCircleCheck size={16} color="green" />
                <Text size="sm" c="green">{testState.message}</Text>
              </Group>
            )}
            {testState.status === 'error' && (
              <Group gap={4}>
                <IconAlertCircle size={16} color="red" />
                <Text size="sm" c="red">{testState.message}</Text>
              </Group>
            )}
          </Group>
        </Stack>
      </Card>
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={handleClose}>Close</Button>
      </Group>
    </Modal>
  );
};

export default UserSettingsDialog;
