import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconTrash } from '@tabler/icons-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import { PATHS } from '@app/routes/paths';
import PageShell from '@components/common/PageShell';
import { useUpdateAssessment, useDeleteAssessment } from '@features/assessments/api';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useSyncedField } from '@hooks/useSyncedField';
import { FORM_MAX_WIDTH } from '@lib/constants';
import { getErrorMessage } from '@utils/error';
import { buildPassphraseKey, clearPassphrase } from '@utils/passphrase';

const SettingsPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  const navigate = useNavigate();
  const { passphrase, setPassphrase, clear } = useAssessmentPassphrase();

  useDocumentTitle(`Settings - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const [name, setName] = useSyncedField(assessment?.name ?? '');
  const [description, setDescription] = useSyncedField(assessment?.description ?? '');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState('');
  const [showForgetModal, setShowForgetModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateMutation = useUpdateAssessment();
  const deleteMutation = useDeleteAssessment();

  const hasStoredPassphrase = !!passphrase;

  const handleSave = () => {
    updateMutation.mutate({ id: assessmentId, payload: { name, description } }, {
      onSuccess: () => notifications.show({ color: 'green', message: 'Assessment updated' }),
      onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) || 'Update failed' }),
    });
  };

  const handleForgetPassphrase = () => {
    clearPassphrase(buildPassphraseKey(assessmentId));
    clear();
    notifications.show({ color: 'blue', message: 'Passphrase forgotten' });
  };

  const handleCopyPassphrase = () => {
    if (!passphrase) return;
    void navigator.clipboard.writeText(passphrase).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStorePassphrase = () => {
    if (!newPassphrase.trim()) return;
    setPassphrase(newPassphrase.trim(), true);
    setNewPassphrase('');
    notifications.show({ color: 'green', message: 'Passphrase stored' });
  };

  const handleDelete = () => {
    deleteMutation.mutate(assessmentId, {
      onSuccess: () => {
        notifications.show({ color: 'green', message: 'Assessment deleted' });
        void navigate(PATHS.ASSESSMENTS);
      },
      onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) || 'Delete failed' }),
    });
  };

  return (
    <PageShell title="Assessment Settings">
      <Stack gap={0} maw={FORM_MAX_WIDTH}>
        {/* General */}
        <Box mb="xl">
          <Text fw={600} mb="sm">General</Text>
          <Stack gap="sm">
            <TextInput
              label="Name"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              autosize
              minRows={2}
            />
            {updateMutation.isError && (
              <Alert color="red">{getErrorMessage(updateMutation.error)}</Alert>
            )}
            <Group justify="flex-end">
              <Button onClick={handleSave} loading={updateMutation.isPending} disabled={!name.trim()}>
                Save changes
              </Button>
            </Group>
          </Stack>
        </Box>

        <Divider mb="xl" />

        {/* Encryption */}
        <Box mb="xl">
          <Text fw={600} mb="sm">Encryption</Text>
          {hasStoredPassphrase ? (
            <Stack gap="sm">
              <Text size="sm" c="dimmed">Student ID passphrase is stored in this browser.</Text>
              <Group align="flex-end" gap="xs">
                <PasswordInput
                  label="Stored passphrase"
                  value={passphrase ?? ''}
                  readOnly
                  style={{ flex: 1 }}
                />
                <Tooltip label={copied ? 'Copied!' : 'Copy to clipboard'} withArrow>
                  <ActionIcon
                    variant="default"
                    size="lg"
                    onClick={handleCopyPassphrase}
                    aria-label="Copy passphrase"
                    mb={1}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Box>
                <Button variant="outline" color="orange" onClick={() => setShowForgetModal(true)}>
                  Forget stored passphrase
                </Button>
              </Box>
            </Stack>
          ) : (
            <Stack gap="sm">
              <Text size="sm" c="dimmed">No passphrase stored for this assessment.</Text>
              <Group align="flex-end" gap="sm">
                <PasswordInput
                  label="Store passphrase"
                  placeholder="Enter passphrase to store in browser"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.currentTarget.value)}
                  w={320}
                />
                <Button
                  onClick={handleStorePassphrase}
                  disabled={!newPassphrase.trim()}
                >
                  Store
                </Button>
              </Group>
            </Stack>
          )}
        </Box>

        <Divider mb="xl" />

        {/* Danger Zone */}
        <Box>
          <Text fw={600} c="red" mb="sm">Danger Zone</Text>
          <Button
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={() => setShowDeleteModal(true)}
          >
            Delete this assessment
          </Button>
          <Text size="xs" c="dimmed" mt="xs">
            Permanently deletes the assessment, all submissions, rules, and results.
          </Text>
        </Box>

        <Modal
          opened={showForgetModal}
          onClose={() => setShowForgetModal(false)}
          title="Forget Passphrase"
          size="sm"
        >
          <Text mb="md">
            This will remove the stored passphrase from this browser. You will need to re-enter
            it to decrypt student IDs. Are you sure?
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => setShowForgetModal(false)}>
              Cancel
            </Button>
            <Button
              color="orange"
              onClick={() => {
                setShowForgetModal(false);
                handleForgetPassphrase();
              }}
            >
              Forget passphrase
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setDeleteConfirmName(''); }}
          title="Delete Assessment"
        >
          <Text mb="md">
            This action cannot be undone. Type <strong>{assessment?.name}</strong> to confirm.
          </Text>
          <TextInput
            placeholder={assessment?.name ?? ''}
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.currentTarget.value)}
            mb="md"
          />
          {deleteMutation.isError && (
            <Alert color="red" mb="md">{getErrorMessage(deleteMutation.error)}</Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(''); }}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              disabled={deleteConfirmName !== assessment?.name}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Group>
        </Modal>
      </Stack>
    </PageShell>
  );
};

export default SettingsPage;
