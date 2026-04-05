import {
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import { useUpdateAssessment, useDeleteAssessment } from '@features/assessments/api';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';
import { buildPassphraseKey, clearPassphrase } from '@utils/passphrase';

const SettingsPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const { assessment } = useAssessmentContext();
  const navigate = useNavigate();
  const { passphrase, setPassphrase, clear } = useAssessmentPassphrase();

  useDocumentTitle(`Settings - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const [name, setName] = useState(assessment?.name ?? '');
  const [description, setDescription] = useState(assessment?.description ?? '');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState('');

  // Sync form when assessment data loads
  useEffect(() => {
    if (assessment) {
      setName(assessment.name ?? '');
      setDescription(assessment.description ?? '');
    }
  }, [assessment]);

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
        void navigate('/assessments');
      },
      onError: (e) => notifications.show({ color: 'red', message: getErrorMessage(e) || 'Delete failed' }),
    });
  };

  return (
    <PageShell title="Assessment Settings">

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
            <Box>
              <Button variant="outline" color="orange" onClick={handleForgetPassphrase}>
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
    </PageShell>
  );
};

export default SettingsPage;
