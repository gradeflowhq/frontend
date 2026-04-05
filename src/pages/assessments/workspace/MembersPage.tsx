import { Alert, Badge, Button, Group, Modal, Select, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import {
  useMembers,
  useAddMember,
  useSetMemberRole,
  useRemoveMember,
} from '@features/assessments/api';
import MembersTable from '@features/assessments/components/MembersTable';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import type { UserResponse, UserResponseRole } from '@api/models';

const MembersPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const { assessment } = useAssessmentContext();

  useDocumentTitle(`Members - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState<UserResponseRole>('viewer');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useMembers(assessmentId, !!assessmentId);
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
    [setMemberRole],
  );

  return (
    <PageShell title={
      <Group gap="sm" align="center">
        <Title order={3}>Members</Title>
        {!isLoading && <Badge variant="light" size="sm">{items.length}</Badge>}
      </Group>
    }>
      {/* Add member form */}
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
          w={160}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          loading={addMember.isPending}
          disabled={!userEmail.trim()}
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

      {isError && <Alert color="red" mb="md">{getErrorMessage(error)}</Alert>}
      {addMember.isError && <Alert color="red" mb="md">{getErrorMessage(addMember.error)}</Alert>}
      {setMemberRole.isError && <Alert color="red" mb="md">{getErrorMessage(setMemberRole.error)}</Alert>}
      {removeMember.isError && <Alert color="red" mb="md">{getErrorMessage(removeMember.error)}</Alert>}

      {!isError && (
        <MembersTable
          items={items}
          isLoading={isLoading}
          onSetRole={handleSetRole}
          onRemove={(userId) => setRemoveTarget(userId)}
        />
      )}

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
    </PageShell>
  );
};

export default MembersPage;
