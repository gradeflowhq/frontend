import { useQuery } from '@tanstack/react-query';

import { api } from '@api';
import { QK } from '@api/queryKeys';
import { CACHE_STALE_TIME_AUTH } from '@lib/constants';

import type { MeResponse } from '@api/models';

export const useMe = (enabled = true) =>
  useQuery({
    queryKey: QK.auth.me,
    queryFn: async () => (await api.meUsersMeGet()).data as MeResponse,
    staleTime: CACHE_STALE_TIME_AUTH,
    enabled,
  });
