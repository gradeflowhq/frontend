import type {
  AdjustableSubmission,
  AdjustableQuestionResult,
  GradingResponse,
  GradeAdjustmentRequest,
  GradingDownloadRequest,
  GradingDownloadResponse,
} from '@api/models';

export type {
  AdjustableSubmission,
  AdjustableQuestionResult,
  GradingResponse,
  GradeAdjustmentRequest,
  GradingDownloadRequest,
  GradingDownloadResponse,
};

// View model (optional alias)
export type TotalsRow = { id: string; totalPoints: number; totalMax: number };