import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../common/Modal';
import ErrorAlert from '../common/ErrorAlert';
import ConfirmDialog from '../common/ConfirmDialog';
import MembersTable from '../members/MembersTable';
import { api } from '../../api';
import type {
  AssessmentUsersResponse,
  UserResponse,
  AddMemberRequest,
  SetRoleRequest,
  UserResponseRole,
} from '../../api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const MembersDialog: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const qc = useQueryClient();

  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState<UserResponseRole>('viewer');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null); // NEW

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['members', assessmentId],
    queryFn: async () => {
      const res = await api.listMembersAssessmentsAssessmentIdMembersGet(assessmentId);
      return res.data as AssessmentUsersResponse;
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationKey: ['members', assessmentId, 'add'],
    mutationFn: async () => {
      const payload: AddMemberRequest = { user_email: userEmail, role };
      const res = await api.addMemberAssessmentsAssessmentIdMembersPost(assessmentId, payload);
      return res.data;
    },
    onSuccess: () => {
      setUserEmail('');
      setRole('viewer');
      qc.invalidateQueries({ queryKey: ['members', assessmentId] });
    },
  });

  const setRoleMutation = useMutation({
    mutationKey: ['members', assessmentId, 'setRole'],
    mutationFn: async ({ userId, role }: { userId: string; role: UserResponseRole }) => {
      const payload: SetRoleRequest = { role };
      const res = await api.setMemberRoleAssessmentsAssessmentIdMembersUserIdPatch(assessmentId, userId, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', assessmentId] });
    },
  });

  const removeMutation = useMutation({
    mutationKey: ['members', assessmentId, 'remove'],
    mutationFn: async (userId: string) => {
      const res = await api.removeMemberAssessmentsAssessmentIdMembersUserIdDelete(assessmentId, userId);
      return res.data;
    },
    onSuccess: () => {
      setRemoveTarget(null);
      qc.invalidateQueries({ queryKey: ['members', assessmentId] });
    },
  });

  const items: UserResponse[] = data?.items ?? [];

  const handleSetRole = useCallback(
    async (userId: string, r: UserResponseRole) => {
      await setRoleMutation.mutateAsync({ userId, role: r });
    },
    [setRoleMutation]
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !userEmail}
        >
          {addMutation.isPending ? 'Adding...' : 'Add'}
        </button>
      </div>

      {isLoading && <div className="alert alert-info mt-3"><span>Loading members...</span></div>}
      {isError && <ErrorAlert error={error} className="mt-3" />}
      {addMutation.isError && <ErrorAlert error={addMutation.error} className="mt-3" />}
      {setRoleMutation.isError && <ErrorAlert error={setRoleMutation.error} className="mt-3" />}
      {removeMutation.isError && <ErrorAlert error={removeMutation.error} className="mt-3" />}

      {!isLoading && !isError && (
        <div className="mt-4">
          <MembersTable
            items={items}
            onSetRole={handleSetRole}
            onRemove={(userId) => setRemoveTarget(userId)} // NEW: open confirm
          />
        </div>
      )}

      <div className="modal-action">
        <button
          type="button"
          className="btn"
          onClick={onClose}
          disabled={addMutation.isPending || setRoleMutation.isPending || removeMutation.isPending}
        >
          Close
        </button>
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Member"
        message="Are you sure you want to remove this member from the assessment?"
        confirmText={removeMutation.isPending ? 'Removing...' : 'Remove'}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
    </Modal>
  );
};

export default MembersDialog;