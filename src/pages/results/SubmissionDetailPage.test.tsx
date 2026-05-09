import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssessmentContext } from '@app/contexts/AssessmentContext';
import { useAssessmentPassphrase } from '@features/encryption/PassphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import { useGrading, useAdjustGrading } from '@features/grading/api';
import { useQuestionSet } from '@features/questions/api';
import { useRubricOverview } from '@features/rubric/api';

import SubmissionDetailPage from './SubmissionDetailPage';

vi.mock('@features/encryption/PassphraseContext', () => ({
  useAssessmentPassphrase: vi.fn(),
}));

vi.mock('@features/encryption/useDecryptedIds', () => ({
  useDecryptedIds: vi.fn(),
}));

vi.mock('@features/grading/api', () => ({
  useGrading: vi.fn(),
  useAdjustGrading: vi.fn(),
}));

vi.mock('@features/grading/components', () => ({
  GradingStatusBanner: () => <div data-testid="grading-status-banner" />,
}));

vi.mock('@features/questions/api', () => ({
  useQuestionSet: vi.fn(),
}));

vi.mock('@features/rubric/api', () => ({
  useRubricOverview: vi.fn(),
}));

const mockUseAssessmentPassphrase = vi.mocked(useAssessmentPassphrase);
const mockUseDecryptedIds = vi.mocked(useDecryptedIds);
const mockUseGrading = vi.mocked(useGrading);
const mockUseAdjustGrading = vi.mocked(useAdjustGrading);
const mockUseQuestionSet = vi.mocked(useQuestionSet);
const mockUseRubricOverview = vi.mocked(useRubricOverview);

const gradingData = {
  submissions: [
    {
      student_id: 'student-1',
      answer_map: { q1: 'Answer one' },
      result_map: {
        q1: {
          output: true,
          passed: true,
          feedback: 'Good work',
          rule: 'rule-1',
          graded: true,
          points: 4,
          max_points: 5,
          adjusted_points: null,
          adjusted_feedback: null,
        },
      },
    },
  ],
  status: { updated_at: '2026-05-09T00:00:00Z' },
};

const renderPage = () =>
  render(
    <MantineProvider>
      <AssessmentContext.Provider
        value={{
          assessmentId: 'assessment-1',
          assessment: { name: 'Midterm' } as never,
        }}
      >
        <MemoryRouter initialEntries={['/assessments/assessment-1/results/students/student-1']}>
          <Routes>
            <Route
              path="/assessments/:assessmentId/results/students/:studentId"
              element={<SubmissionDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </AssessmentContext.Provider>
    </MantineProvider>,
  );

describe('SubmissionDetailPage', () => {
  beforeEach(() => {
    document.title = 'GradeFlow';
    vi.clearAllMocks();

    mockUseAssessmentPassphrase.mockReturnValue({
      passphrase: null,
      setPassphrase: vi.fn(),
      notifyEncryptedDetected: vi.fn(),
      clear: vi.fn(),
    });
    mockUseDecryptedIds.mockReturnValue({
      decryptedIds: { 'student-1': 'student-1' },
      isDecrypting: false,
    });
    mockUseGrading.mockReturnValue({
      data: gradingData,
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    mockUseAdjustGrading.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    } as never);
    mockUseQuestionSet.mockReturnValue({
      data: {
        question_set: {
          question_map: {
            q1: { description: 'Question one' },
          },
        },
      },
    } as never);
    mockUseRubricOverview.mockReturnValue({ data: null } as never);
  });

  it('renders a page heading and document title for the submission', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Submission' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Navigate to student' })).toHaveValue('student-1');

    await waitFor(() => {
      expect(document.title).toBe('Submission student-1 - Midterm - GradeFlow');
    });
  });
});
