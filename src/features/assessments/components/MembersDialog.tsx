import React, { useState, useCallback } from 'react';
import { Button } from '@components/ui/Button';
import { IconPlus } from '@components/ui/Icon';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';
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
      await setMemberRole.mutateAsync({ userId, role: r });
    },
    [setMemberRole]
  );

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-3xl">
      <h3 className="font-bold text-lg">Members</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
        <div className="form-control md:col-span-2">
          <label className="label"><span className="label-text">User email</span></label>
          <input
            type="email"
            className="input input-bordered w-full"
            placeholder="user@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Role</span></label>
          <select
            className="select select-bordered w-full"
            value={role}
            onChange={(e) => setRole(e.target.value as UserResponseRole)}
          >
            <option value="owner">owner</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <Button
          type="button"
          variant="primary"
          onClick={() => addMember.mutate({ user_email: userEmail, role })}
          disabled={addMember.isPending || !userEmail}
          leftIcon={<IconPlus />}
        >
          {addMember.isPending ? 'Adding...' : 'Add'}
        </Button>
      </div>

      {isLoading && <div className="alert alert-info mt-3"><span>Loading members...</span></div>}
      {isError && <ErrorAlert error={error} className="mt-3" />}
      {addMember.isError && <ErrorAlert error={addMember.error} className="mt-3" />}
      {setMemberRole.isError && <ErrorAlert error={setMemberRole.error} className="mt-3" />}
      {removeMember.isError && <ErrorAlert error={removeMember.error} className="mt-3" />}

      {!isLoading && !isError && (
        <div className="mt-4">
          <MembersTable
            items={items}
            onSetRole={handleSetRole}
            onRemove={(userId) => setRemoveTarget(userId)}
          />
        </div>
      )}

      <div className="modal-action">
        <Button type="button" onClick={onClose} disabled={addMember.isPending || setMemberRole.isPending || removeMember.isPending}>
          Close
        </Button>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Member"
        message="Are you sure you want to remove this member from the assessment?"
        confirmText={removeMember.isPending ? 'Removing...' : 'Remove'}
        onConfirm={() => removeTarget && removeMember.mutate(removeTarget, { onSuccess: () => setRemoveTarget(null) })}
        onCancel={() => setRemoveTarget(null)}
      />
    </Modal>
  );
};

export default MembersDialog;