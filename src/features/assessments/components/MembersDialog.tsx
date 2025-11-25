import React, { useState, useCallback } from 'react';
import LoadingButton from '@components/ui/LoadingButton';
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

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-3xl">
      <h3 className="font-bold text-lg">Members</h3>

      {/* One-line Add row */}
      <div className="mt-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="form-control md:flex-1">
            <label className="label"><span className="label-text">User email</span></label>
            <input
              type="email"
              className="input input-bordered w-full"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>

          <div className="form-control md:w-48">
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

          <div className="md:pb-0">
            <LoadingButton
              type="button"
              variant="primary"
              onClick={() => addMember.mutate({ user_email: userEmail, role }, { onSuccess: () => { setUserEmail('') } })}
              disabled={!userEmail}
              isLoading={addMember.isPending}
              leftIcon={<IconPlus />}
              className="w-full md:w-auto"
              title="Add member"
            >
              Add
            </LoadingButton>
          </div>
        </div>
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
        <Button
          type="button"
          onClick={onClose}
          disabled={addMember.isPending || setMemberRole.isPending || removeMember.isPending}
        >
          Close
        </Button>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Member"
        message="Are you sure you want to remove this member from the assessment?"
        confirmLoading={removeMember.isPending}
        confirmLoadingLabel="Removing..."
        confirmText="Remove"
        onConfirm={() =>
          removeTarget &&
          removeMember.mutate(removeTarget, { onSuccess: () => setRemoveTarget(null) })
        }
        onCancel={() => setRemoveTarget(null)}
      />
    </Modal>
  );
};

export default MembersDialog;