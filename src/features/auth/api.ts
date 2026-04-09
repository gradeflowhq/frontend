import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@api';
import { QK } from '@api/queryKeys';

import type {
  BodyIssueTokenAuthTokenPost,
  MeResponse,
  SignupRequest,
  TokenPairResponse,
  UpdateMeRequest,
} from '@api/models';

// ── Queries ───────────────────────────────────────────────────────────────────

export const useMe = (enabled = true) =>
  useQuery({
    queryKey: QK.auth.me,
    queryFn: async () => (await api.meAuthMeGet()).data as MeResponse,
    staleTime: 5 * 60 * 1000,
    enabled,
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useLogin = () =>
  useMutation({
    mutationKey: ['auth', 'login'],
    mutationFn: async (payload: BodyIssueTokenAuthTokenPost) =>
      (await api.issueTokenAuthTokenPost(payload)).data as TokenPairResponse,
  });

export const useSignup = () =>
  useMutation({
    mutationKey: ['auth', 'signup'],
    mutationFn: async (payload: SignupRequest) =>
      (await api.signupAuthSignupPost(payload)).data as TokenPairResponse,
  });

export const useLogout = () =>
  useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: async () => api.logoutAuthLogoutPost(),
  });

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['auth', 'update-me'],
    mutationFn: async (payload: UpdateMeRequest) =>
      (await api.updateMeAuthMePatch(payload)).data as MeResponse,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.auth.me });
    },
  });
};
