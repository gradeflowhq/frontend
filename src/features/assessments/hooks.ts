import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type {
  AssessmentsListResponse,
  AssessmentResponse,
  AssessmentCreateRequest,
  AssessmentUpdateRequest,
  AssessmentUsersResponse,
  AddMemberRequest,
  SetRoleRequest,
 } from '@api/models';

export const useAssessmentsList = () =>
  useQuery({
    queryKey: QK.assessments.list,
    queryFn: async () => (await api.listAssessmentsAssessmentsGet()).data as AssessmentsListResponse,
    staleTime: 2 * 60 * 1000,
  });

export const useAssessment = (id: string, enabled = true) =>
  useQuery({
    queryKey: QK.assessments.item(id),
    queryFn: async () => (await api.getAssessmentAssessmentsAssessmentIdGet(id)).data as AssessmentResponse,
    enabled,
  });

export const useCreateAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['assessments', 'create'],
    mutationFn: async (payload: AssessmentCreateRequest) =>
      (await api.createAssessmentAssessmentsPost(payload)).data as AssessmentResponse,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.assessments.list }),
  });
};

export const useUpdateAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['assessments', 'update'],
    mutationFn: async ({ id, payload }: { id: string; payload: AssessmentUpdateRequest }) =>
      (await api.updateAssessmentAssessmentsAssessmentIdPatch(id, payload)).data as AssessmentResponse,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: QK.assessments.list });
      qc.invalidateQueries({ queryKey: QK.assessments.item(vars.id) });
    },
  });
};

export const useDeleteAssessment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['assessments', 'delete'],
    mutationFn: async (id: string) => (await api.deleteAssessmentAssessmentsAssessmentIdDelete(id)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.assessments.list }),
  });
};

// Members (optional under assessments)
export const useMembers = (assessmentId: string, enabled = true) =>
  useQuery({
    queryKey: ['members', assessmentId],
    queryFn: async () => (await api.listMembersAssessmentsAssessmentIdMembersGet(assessmentId)).data as AssessmentUsersResponse,
    enabled,
  });

export const useAddMember = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['members', assessmentId, 'add'],
    mutationFn: async (payload: AddMemberRequest) =>
      (await api.addMemberAssessmentsAssessmentIdMembersPost(assessmentId, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', assessmentId] }),
  });
};

export const useSetMemberRole = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['members', assessmentId, 'setRole'],
    mutationFn: async ({ userId, role }: { userId: string; role: SetRoleRequest['role'] }) =>
      (await api.setMemberRoleAssessmentsAssessmentIdMembersUserIdPatch(assessmentId, userId, { role })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', assessmentId] }),
  });
};

export const useRemoveMember = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['members', assessmentId, 'remove'],
    mutationFn: async (userId: string) =>
      (await api.removeMemberAssessmentsAssessmentIdMembersUserIdDelete(assessmentId, userId)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', assessmentId] }),
  });
};