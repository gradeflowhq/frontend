import { Text } from '@mantine/core';
import React from 'react';

import type { TextProps } from '@mantine/core';

type SectionLabelProps = TextProps & { children?: React.ReactNode };

/**
 * Small uppercase section heading with consistent letter-spacing.
 * Accepts all Mantine Text props for color, margin, etc.
 */
const SectionLabel = ({ children, style, ...rest }: SectionLabelProps) => (
  <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.06em', ...style }} {...rest}>
    {children}
  </Text>
);

export default SectionLabel;
