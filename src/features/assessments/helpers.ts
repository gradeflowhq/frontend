import type { UserResponseRole } from '@api/models';
import type { CanManage } from './types';

export const rolePermissions = (role: UserResponseRole): CanManage => ({
  canEditAssessment: role === 'owner' || role === 'editor',
  canDeleteAssessment: role === 'owner',
  canManageMembers: role === 'owner' || role === 'editor',
});