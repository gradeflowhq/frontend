import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconMoon,
  IconPalette,
  IconPlug,
  IconSun,
  IconUser,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { createCanvasClient, parseCanvasBaseUrl } from '@api/canvasClient';
import PageShell from '@components/common/PageShell';
import { useMe, useUpdateMe } from '@features/auth/api';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useSyncedField } from '@hooks/useSyncedField';
import { FORM_MAX_WIDTH } from '@lib/constants';
import { useUserSettingsStore } from '@state/userStore';
import { getErrorMessage } from '@utils/error';

import type { AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// User Tab — sub-sections
// ---------------------------------------------------------------------------

const NameSection: React.FC<{ initialValue: string }> = ({ initialValue }) => {
  const [name, setName] = useSyncedField(initialValue);
  const [error, setError] = useState('');
  const updateMe = useUpdateMe();

  const handleSave = async () => {
    setError('');
    try {
      await updateMe.mutateAsync({ name: name || null });
      notifications.show({ color: 'green', message: 'Name updated' });
    } catch (e) {
      setError(getErrorMessage(e) || 'Failed to update name');
    }
  };

  return (
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
        {error && <Alert color="red" icon={<IconAlertCircle size={16} />}>{error}</Alert>}
        <Group justify="flex-end">
          <Button loading={updateMe.isPending} onClick={() => void handleSave()}>Save name</Button>
        </Group>
      </Stack>
    </Box>
  );
};

const EmailSection: React.FC<{ initialValue: string }> = ({ initialValue }) => {
  const [email, setEmail] = useSyncedField(initialValue);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const updateMe = useUpdateMe();

  const handleSave = async () => {
    setError('');
    try {
      await updateMe.mutateAsync({ email, current_password: password });
      setPassword('');
      notifications.show({ color: 'green', message: 'Email updated' });
    } catch (e) {
      setError(getErrorMessage(e) || 'Failed to update email');
    }
  };

  return (
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
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        {error && <Alert color="red" icon={<IconAlertCircle size={16} />}>{error}</Alert>}
        <Group justify="flex-end">
          <Button
            loading={updateMe.isPending}
            disabled={!email.trim() || !password}
            onClick={() => void handleSave()}
          >
            Update email
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

const PasswordSection: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const updateMe = useUpdateMe();

  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setError('');
    try {
      await updateMe.mutateAsync({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notifications.show({ color: 'green', message: 'Password updated' });
    } catch (e) {
      setError(getErrorMessage(e) || 'Failed to update password');
    }
  };

  return (
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
        {error && <Alert color="red" icon={<IconAlertCircle size={16} />}>{error}</Alert>}
        <Group justify="flex-end">
          <Button
            loading={updateMe.isPending}
            disabled={!currentPassword || !newPassword || !confirmPassword}
            onClick={() => void handleSave()}
          >
            Change password
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Appearance Tab
// ---------------------------------------------------------------------------

const AppearanceTab: React.FC = () => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Box maw={FORM_MAX_WIDTH}>
      <Text fw={600} mb="sm">Color Scheme</Text>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Choose how GradeFlow looks. "Auto" follows your system preference.
        </Text>
        <SegmentedControl
          value={colorScheme}
          onChange={(v) => setColorScheme(v as 'light' | 'dark' | 'auto')}
          data={[
            {
              value: 'light',
              label: (
                <Group gap={6} wrap="nowrap">
                  <IconSun size={14} />
                  Light
                </Group>
              ),
            },
            {
              value: 'dark',
              label: (
                <Group gap={6} wrap="nowrap">
                  <IconMoon size={14} />
                  Dark
                </Group>
              ),
            },
            {
              value: 'auto',
              label: (
                <Group gap={6} wrap="nowrap">
                  Auto
                </Group>
              ),
            },
          ]}
        />
      </Stack>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// User Tab
// ---------------------------------------------------------------------------

const UserTab: React.FC = () => {
  const { data: me } = useMe();

  return (
    <Stack gap={0} maw={FORM_MAX_WIDTH}>
      <NameSection initialValue={me?.name ?? ''} />
      <Divider mb="xl" />
      <EmailSection initialValue={me?.email ?? ''} />
      <Divider mb="xl" />
      <PasswordSection />
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
    <Box maw={FORM_MAX_WIDTH}>
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
  const initialTab = (searchParams.get('tab') ?? 'user') as 'user' | 'integrations' | 'appearance';

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
          <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
            Appearance
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="user">
          <UserTab />
        </Tabs.Panel>

        <Tabs.Panel value="integrations">
          <IntegrationsTab />
        </Tabs.Panel>

        <Tabs.Panel value="appearance">
          <AppearanceTab />
        </Tabs.Panel>
      </Tabs>
    </PageShell>
  );
};

export default UserSettingsPage;
