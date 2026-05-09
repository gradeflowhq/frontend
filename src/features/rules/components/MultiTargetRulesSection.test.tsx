import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import MultiTargetRulesSection from './MultiTargetRulesSection';

import type { RuleValue } from '../types';
import type { RubricCoverage } from '@api/models';

const apiMocks = vi.hoisted(() => ({
  useCompatibleRules: vi.fn(),
  useCreateRule: vi.fn(),
  useDeleteRule: vi.fn(),
}));

vi.mock('@features/rules/api', () => apiMocks);

const renderSection = () => render(
  <MantineProvider>
    <MemoryRouter>
      <MultiTargetRulesSection
        globalRules={[
          {
            id: 'rule-1',
            type: 'CUSTOM_CODE_MULTI',
            display_name: 'Custom Code',
          } as RuleValue,
        ]}
        coverage={{
          question_ids: ['q1'],
          covered_question_ids: ['q1'],
          uncovered_question_ids: [],
          question_rules: {},
          global_rules: { q1: 'rule-1' },
          questions_by_rule: { 'rule-1': ['q1'] },
          total: 1,
          covered: 1,
          percentage: 100,
        } satisfies RubricCoverage}
        assessmentId="assessment-1"
        guard={(run) => run()}
        onEditStateChange={vi.fn()}
        registerResetEditing={vi.fn()}
      />
    </MemoryRouter>
  </MantineProvider>,
);

describe('MultiTargetRulesSection', () => {
  it('shows a skeleton while global rule types are loading', () => {
    apiMocks.useCompatibleRules.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    apiMocks.useCreateRule.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    apiMocks.useDeleteRule.mockReturnValue({ mutate: vi.fn() });

    renderSection();

    expect(screen.getAllByLabelText('Loading global rules').length).toBeGreaterThan(0);
    expect(screen.queryByText('No global rule types are available.')).not.toBeInTheDocument();
    expect(screen.queryByText('No global rules yet.')).not.toBeInTheDocument();
  });
});
