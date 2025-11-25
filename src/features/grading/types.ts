import type {
  AdjustableGradedSubmission,
  AdjustableQuestionResult,
  GradingResponse,
  GradeAdjustmentRequest,
  GradingExportRequest,
  GradingExportResponse,
} from '@api/models';

export type {
  AdjustableGradedSubmission,
  AdjustableQuestionResult,
  GradingResponse,
  GradeAdjustmentRequest,
  GradingExportRequest,
  GradingExportResponse,
};

// View model (optional alias)
export type TotalsRow = { id: string; totalPoints: number; totalMax: number };