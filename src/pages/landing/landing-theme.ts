import type { MantineColorScheme } from '@mantine/core';

const isDarkScheme = (colorScheme: MantineColorScheme) => colorScheme === 'dark';

export const getLandingHeroBackground = (colorScheme: MantineColorScheme): string => {
  return isDarkScheme(colorScheme)
    ? 'radial-gradient(circle at top, rgba(34, 139, 230, 0.18) 0%, rgba(34, 139, 230, 0) 48%), linear-gradient(150deg, var(--mantine-color-dark-5) 0%, var(--mantine-color-dark-7) 55%, var(--mantine-color-dark-9) 100%)'
    : 'radial-gradient(circle at top, rgba(34, 139, 230, 0.16) 0%, rgba(34, 139, 230, 0) 44%), linear-gradient(150deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-gray-0) 58%, var(--mantine-color-body) 100%)';
};

export const getLandingCtaBackground = (colorScheme: MantineColorScheme): string => {
  return isDarkScheme(colorScheme)
    ? 'radial-gradient(circle at top, rgba(34, 139, 230, 0.14) 0%, rgba(34, 139, 230, 0) 52%), linear-gradient(135deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-9) 100%)'
    : 'radial-gradient(circle at top, rgba(34, 139, 230, 0.12) 0%, rgba(34, 139, 230, 0) 42%), linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-cyan-6) 100%)';
};

export const getLandingFeatureIconColors = (
  colorScheme: MantineColorScheme,
): { background: string; color: string } => {
  return isDarkScheme(colorScheme)
    ? {
        background: 'rgba(34, 139, 230, 0.12)',
        color: 'var(--mantine-color-blue-3)',
      }
    : {
        background: 'var(--mantine-color-blue-0)',
        color: 'var(--mantine-color-blue-6)',
      };
};

export const getLandingSourceBadgeStyles = (
  colorScheme: MantineColorScheme,
): { backgroundColor: string; borderColor: string; color: string } => {
  return isDarkScheme(colorScheme)
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255, 255, 255, 0.14)',
        color: 'var(--mantine-color-gray-0)',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.88)',
        borderColor: 'var(--mantine-color-gray-3)',
        color: 'var(--mantine-color-gray-8)',
      };
};