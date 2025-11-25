// frontend/src/pages/AssessmentsPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { Button } from '@components/ui/Button';
import { IconPlus } from '@components/ui/Icon';
import PageHeader from '@components/common/PageHeader';
import ErrorAlert from '@components/common/ErrorAlert';
import ConfirmDialog from '@components/common/ConfirmDialog';
import {
  AssessmentsTable,
  AssessmentCreateModal,
  AssessmentEditModal,
} from '@features/assessments/components';
import {
  useAssessmentsList,
  useCreateAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
} from '@features/assessments/hooks';
import type { AssessmentResponse, AssessmentCreateRequest, AssessmentUpdateRequest } from '@api/models';

const AssessmentsPage: React.FC = () => {
  useDocumentTitle('Assessments - GradeFlow');

  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<AssessmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentResponse | null>(null);

  const { data, isLoading, isError, error } = useAssessmentsList();
  const createMutation = useCreateAssessment();
  const updateMutation = useUpdateAssessment();
  const deleteMutation = useDeleteAssessment();

  const items = data?.items ?? [];

  return (
    <section>
      <PageHeader
        title="Assessments"
        actions={
          <Button variant="ghost" onClick={() => setShowCreate(true)} leftIcon={<IconPlus />}>
            Add Assessment
          </Button>
        }
      />

      {isLoading && (
        <div className="animate-pulse">
          <div className="h-10 bg-base-200 rounded mb-2" />
          <div className="h-10 bg-base-200 rounded mb-2" />
          <div className="h-10 bg-base-200 rounded" />
        </div>
      )}
      {isError && <ErrorAlert error={error} />}

      {!isLoading && !isError && (
        <AssessmentsTable
          items={items}
          onOpen={(item) => navigate(`/assessments/${item.id}`)}
          onEdit={(item) => setEditItem(item)}
          onDelete={(item) => setDeleteTarget(item)}
        />
      )}

      <AssessmentCreateModal
        open={showCreate}
        isSubmitting={createMutation.isPending}
        error={createMutation.isError ? createMutation.error : null}
        onClose={() => setShowCreate(false)}
        onSubmit={async (formData: AssessmentCreateRequest) => {
          await createMutation.mutateAsync(formData, { onSuccess: () => setShowCreate(false) });
        }}
      />

      <AssessmentEditModal
        openItem={editItem}
        isSubmitting={updateMutation.isPending}
        error={updateMutation.isError ? updateMutation.error : null}
        onClose={() => setEditItem(null)}
        onSubmit={async (id: string, formData: AssessmentUpdateRequest) => {
          await updateMutation.mutateAsync({ id, payload: formData }, { onSuccess: () => setEditItem(null) });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} className="mt-2" />}
    </section>
  );
};

export default AssessmentsPage;