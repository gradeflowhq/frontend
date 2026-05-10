import { Box, Code } from '@mantine/core';
import Markdown, { type MarkdownToJSX } from 'markdown-to-jsx';
import React from 'react';

type MarkdownTextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface MarkdownTextProps {
  children: string;
  className?: string;
  size?: MarkdownTextSize;
  style?: React.CSSProperties;
}

const markdownOptions: MarkdownToJSX.Options = {
  disableParsingRawHTML: true,
  forceInline: true,
  overrides: {
    code: { component: Code },
  },
};

const fontSize = (size: MarkdownTextSize): string => `var(--mantine-font-size-${size})`;

const MarkdownText: React.FC<MarkdownTextProps> = ({
  children,
  className,
  size = 'md',
  style,
}) => (
  <Box
    className={className}
    style={{
      fontSize: fontSize(size),
      lineHeight: 'var(--mantine-line-height)',
      overflowWrap: 'anywhere',
      whiteSpace: 'pre-wrap',
      ...style,
    }}
  >
    <Markdown options={markdownOptions}>{children}</Markdown>
  </Box>
);

export default MarkdownText;
