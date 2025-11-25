import type {
  AssessmentResponse,
  AssessmentCreateRequest,
  AssessmentUpdateRequest,
  AssessmentUsersResponse,
  UserResponseRole,
} from '@api/models';

// Direct re-exports (barrel-friendly)
export type { AssessmentResponse, AssessmentCreateRequest, AssessmentUpdateRequest, AssessmentUsersResponse, UserResponseRole };

// Feature-specific derived types (UI-only)
export type AssessmentListItem = Pick<AssessmentResponse, 'id' | 'name' | 'description' | 'created_at' | 'updated_at'>;

// Domain helper result
export type CanManage = {
  canEditAssessment: boolean;
  canDeleteAssessment: boolean;
  canManageMembers: boolean;
};

// Table rows derived from API models
export type AssessmentsTableRow = AssessmentListItem;

// Modal form state can reuse API request types
export type AssessmentEditFormData = AssessmentUpdateRequest;
export type AssessmentCreateFormData = AssessmentCreateRequest;