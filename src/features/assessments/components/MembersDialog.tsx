import { Modal, TextInput, Select, Button, Group, Alert, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import React, { useState, useCallback } from 'react';

import { getErrorMessages } from '@utils/error';

import MembersTable from './MembersTable';
import {
  useMembers,
  useAddMember,
  useSetMemberRole,
  useRemoveMember,
} from '../hooks';

import type { UserResponse, UserResponseRole } from '@api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const MembersDialog: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState<UserResponseRole>('viewer');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useMembers(assessmentId, open);
  const addMember = useAddMember(assessmentId);
  const setMemberRole = useSetMemberRole(assessmentId);
  const removeMember = useRemoveMember(assessmentId);

  const items: UserResponse[] = data?.items ?? [];

  const handleSetRole = useCallback(
    async (userId: string, r: UserResponseRole) => {
      await setMemberRole.mutateAsync({ userId, role: r }, {
        onSuccess: () => notifications.show({ color: 'green', message: 'Role updated' }),
        onError: () => notifications.show({ color: 'red', message: 'Update failed' }),
      });
    },
    [setMemberRole]
  );

  if (!open) return null;

  return (
    <Modal opened={open} onClose={onClose} title="Members" size="xl">
      <Group align="flex-end" mb="md">
        <TextInput
          label="User email"
          type="email"
          placeholder="user@example.com"
          style={{ flex: 1 }}
          value={userEmail}
          onChange={(e) => setUserEmail(e.currentTarget.value)}
        />
        <Select
          label="Role"
          data={['owner', 'editor', 'viewer']}
          value={role}
          onChange={(v) => setRole((v ?? 'viewer') as UserResponseRole)}
          w={192}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          loading={addMember.isPending}
          disabled={!userEmail}
          onClick={() =>
            addMember.mutate({ user_email: userEmail, role }, {
              onSuccess: () => {
                setUserEmail('');
                notifications.show({ color: 'green', message: 'Member added' });
              },
              onError: () => notifications.show({ color: 'red', message: 'Add failed' }),
            })
          }
        >
          Add
        </Button>
      </Group>

      {isError && (
        <Alert color="red" mb="md">{getErrorMessages(error).join(' ')}</Alert>
      )}
      {addMember.isError && (
        <Alert color="red" mb="md">{getErrorMessages(addMember.error).join(' ')}</Alert>
      )}
      {setMemberRole.isError && (
        <Alert color="red" mb="md">{getErrorMessages(setMemberRole.error).join(' ')}</Alert>
      )}
      {removeMember.isError && (
        <Alert color="red" mb="md">{getErrorMessages(removeMember.error).join(' ')}</Alert>
      )}

      {!isError && (
        <MembersTable
          items={items}
          isLoading={isLoading}
          onSetRole={handleSetRole}
          onRemove={(userId) => setRemoveTarget(userId)}
        />
      )}

      <Group justify="flex-end" mt="md">
        <Button
          variant="subtle"
          onClick={onClose}
          disabled={addMember.isPending || setMemberRole.isPending || removeMember.isPending}
        >
          Close
        </Button>
      </Group>

      {/* Confirm remove member */}
      <Modal
        opened={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Member"
        size="sm"
      >
        <Text mb="md">Are you sure you want to remove this member from the assessment?</Text>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button
            color="red"
            loading={removeMember.isPending}
            onClick={() =>
              removeTarget &&
              removeMember.mutate(removeTarget, {
                onSuccess: () => {
                  setRemoveTarget(null);
                  notifications.show({ color: 'green', message: 'Member removed' });
                },
                onError: () => notifications.show({ color: 'red', message: 'Remove failed' }),
              })
            }
          >
            Remove
          </Button>
        </Group>
      </Modal>
    </Modal>
  );
};

export default MembersDialog;
