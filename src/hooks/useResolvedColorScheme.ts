import { useComputedColorScheme } from '@mantine/core';

export const useResolvedColorScheme = () =>
  useComputedColorScheme('light', { getInitialValueInEffect: false });