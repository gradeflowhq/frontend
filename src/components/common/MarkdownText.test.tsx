import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MarkdownText from './MarkdownText';

const renderMarkdown = (markdown: string) => render(
  <MantineProvider>
    <MarkdownText>{markdown}</MarkdownText>
  </MantineProvider>,
);

describe('MarkdownText', () => {
  it('renders markdown code spans', () => {
    renderMarkdown('Expression `answer()` evaluates to `42`.');

    expect(screen.getByText('answer()').tagName).toBe('CODE');
    expect(screen.getByText('42').tagName).toBe('CODE');
  });

  it('preserves newline-oriented descriptions', () => {
    const { container } = renderMarkdown('All must be true:\nMatch one answer.');

    const renderedDescription = screen.getByText(/All must be true/);
    const markdownRoot = renderedDescription.parentElement;

    expect(markdownRoot).toHaveStyle('line-height: var(--mantine-line-height)');
    expect(markdownRoot).toHaveStyle('white-space: pre-wrap');
    expect(renderedDescription.textContent).toContain('\n');
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('does not parse raw HTML', () => {
    renderMarkdown('Do not render <strong>raw HTML</strong>.');

    expect(screen.queryByText('raw HTML')).not.toBeInTheDocument();
    expect(screen.getByText(/<strong>raw HTML<\/strong>/)).toBeInTheDocument();
  });
});
