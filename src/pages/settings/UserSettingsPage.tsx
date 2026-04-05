import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconPlug,
  IconUser,
} from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '@api';
import { createCanvasClient, parseCanvasBaseUrl } from '@api/canvasClient';
import PageShell from '@components/common/PageShell';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useUserSettingsStore } from '@state/userStore';
import { getErrorMessage } from '@utils/error';

import type { MeResponse } from '@api/models';
import type { AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// User Tab
// ---------------------------------------------------------------------------

const UserTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.meAuthMeGet()).data as MeResponse,
    staleTime: 5 * 60 * 1000,
  });

  // -- Name section --
  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  // -- Email section --
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

  // -- Password section --
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setEmail(me.email ?? '');
    }
  }, [me]);

  const handleSaveName = async () => {
    setNameError('');
    setNameSaving(true);
    try {
      await api.updateMeAuthMePatch({ name: name || null });
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      notifications.show({ color: 'green', message: 'Name updated' });
    } catch (e) {
      setNameError(getErrorMessage(e) || 'Failed to update name');
    } finally {
      setNameSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setEmailError('');
    setEmailSaving(true);
    try {
      await api.updateMeAuthMePatch({ email, current_password: emailPassword });
      setEmailPassword('');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      notifications.show({ color: 'green', message: 'Email updated' });
    } catch (e) {
      setEmailError(getErrorMessage(e) || 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setPasswordError('');
    setPasswordSaving(true);
    try {
      await api.updateMeAuthMePatch({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notifications.show({ color: 'green', message: 'Password updated' });
    } catch (e) {
      setPasswordError(getErrorMessage(e) || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <Stack gap={0} maw={520}>
      {/* Display Name */}
      <Box mb="xl">
        <Text fw={600} mb="sm">Display Name</Text>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">Your name shown across the app.</Text>
          <TextInput
            label="Name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          {nameError && <Alert color="red" icon={<IconAlertCircle size={16} />}>{nameError}</Alert>}
          <Group justify="flex-end">
            <Button loading={nameSaving} onClick={() => void handleSaveName()}>
              Save name
            </Button>
          </Group>
        </Stack>
      </Box>

      <Divider mb="xl" />

      {/* Email */}
      <Box mb="xl">
        <Text fw={600} mb="sm">Email Address</Text>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Changing your email requires your current password to verify ownership.
          </Text>
          <TextInput
            label="New email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label="Current password"
            placeholder="Required to change email"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.currentTarget.value)}
          />
          {emailError && <Alert color="red" icon={<IconAlertCircle size={16} />}>{emailError}</Alert>}
          <Group justify="flex-end">
            <Button
              loading={emailSaving}
              disabled={!email.trim() || !emailPassword}
              onClick={() => void handleSaveEmail()}
            >
              Update email
            </Button>
          </Group>
        </Stack>
      </Box>

      <Divider mb="xl" />

      {/* Password */}
      <Box>
        <Text fw={600} mb="sm">Change Password</Text>
        <Stack gap="sm">
          <Text size="sm" c="dimmed">Enter your current password to set a new one (min 12 characters).</Text>
          <PasswordInput
            label="Current password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="New password"
            placeholder="At least 12 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="Confirm new password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          />
          {passwordError && <Alert color="red" icon={<IconAlertCircle size={16} />}>{passwordError}</Alert>}
          <Group justify="flex-end">
            <Button
              loading={passwordSaving}
              disabled={!currentPassword || !newPassword || !confirmPassword}
              onClick={() => void handleSavePassword()}
            >
              Change password
            </Button>
          </Group>
        </Stack>
      </Box>
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Integrations Tab
// ---------------------------------------------------------------------------

type TestState = { status: 'idle' | 'success' | 'error'; message?: string };

const IntegrationsTab: React.FC = () => {
  const { canvasBaseUrl, canvasToken, setCanvasBaseUrl, setCanvasToken } = useUserSettingsStore();
  const [testing, setTesting] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: 'idle' });

  const handleTestAuth = async () => {
    const canvasUrl = parseCanvasBaseUrl(canvasBaseUrl);
    if (!canvasToken) {
      setTestState({ status: 'error', message: 'Enter a Canvas base URL and token first.' });
      return;
    }
    if (!canvasUrl) {
      setTestState({
        status: 'error',
        message: 'Canvas URL must include the protocol (e.g. https://school.instructure.com).',
      });
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
    <Box maw={520}>
      <Text fw={600} mb="sm">Canvas Integration</Text>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Connect GradeFlow to Canvas. Requests are proxied through a local proxy to avoid CORS
          issues. No data or credentials are stored server-side.
        </Text>
        <TextInput
          label="Canvas Host URL"
          placeholder="https://school.instructure.com"
          value={canvasBaseUrl}
          onChange={(e) => {
            setCanvasBaseUrl(e.currentTarget.value);
            setTestState({ status: 'idle' });
          }}
          error={
            canvasBaseUrl && !parseCanvasBaseUrl(canvasBaseUrl)
              ? 'URL must start with https:// or http://'
              : undefined
          }
          description="Example: https://school.instructure.com (do not include /api or /api/v1)."
        />
        <PasswordInput
          label="Canvas access token"
          placeholder="Personal access token"
          value={canvasToken}
          onChange={(e) => {
            setCanvasToken(e.currentTarget.value.trim());
            setTestState({ status: 'idle' });
          }}
          description="Stored only in this browser."
        />
        <Group align="center">
          <Button loading={testing} onClick={() => void handleTestAuth()}>
            {testing ? 'Checking…' : 'Test connection'}
          </Button>
          {testState.status === 'success' && (
            <Group gap={4}>
              <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
              <Text size="sm" c="green">{testState.message}</Text>
            </Group>
          )}
          {testState.status === 'error' && (
            <Group gap={4}>
              <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />
              <Text size="sm" c="red">{testState.message}</Text>
            </Group>
          )}
        </Group>
      </Stack>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const UserSettingsPage: React.FC = () => {
  useDocumentTitle('Settings - GradeFlow');
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') ?? 'user') as 'user' | 'integrations';

  return (
    <PageShell title="Settings">
      <Tabs defaultValue={initialTab} keepMounted={false}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="user" leftSection={<IconUser size={16} />}>
            User
          </Tabs.Tab>
          <Tabs.Tab value="integrations" leftSection={<IconPlug size={16} />}>
            Integrations
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="user">
          <UserTab />
        </Tabs.Panel>

        <Tabs.Panel value="integrations">
          <IntegrationsTab />
        </Tabs.Panel>
      </Tabs>
    </PageShell>
  );
};

export default UserSettingsPage;
