import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ErrorAlert from '../components/common/ErrorAlert';
import { Button } from '../components/ui/Button';
import { IconPlus } from '../components/ui/icons';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AssessmentsTable from '../components/assessments/AssessmentsTable';
import AssessmentCreateModal from '../components/assessments/AssessmentCreateModal';
import AssessmentEditModal from '../components/assessments/AssessmentEditModal';
import PageHeader from '../components/common/PageHeader';
import { api } from '../api';

import type {
  AssessmentsListResponse,
  AssessmentResponse,
  AssessmentCreateRequest,
  AssessmentUpdateRequest
} from '../api/models';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const AssessmentsPage: React.FC = () => {
  useDocumentTitle('Assessments - GradeFlow', []);

  const qc = useQueryClient();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<AssessmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentResponse | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['assessments', 'list'],
    queryFn: async () => {
      const res = await api.listAssessmentsAssessmentsGet();
      return res.data as AssessmentsListResponse;
    },
  });

  const createMutation = useMutation({
    mutationKey: ['assessments', 'create'],
    mutationFn: async (payload: AssessmentCreateRequest) => {
      const res = await api.createAssessmentAssessmentsPost(payload);
      return res.data as AssessmentResponse;
    },
    onSuccess: () => {
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['assessments', 'list'] });
    },
  });

  const updateMutation = useMutation({
    mutationKey: ['assessments', 'update'],
    mutationFn: async ({ id, payload }: { id: string; payload: AssessmentUpdateRequest }) => {
      const res = await api.updateAssessmentAssessmentsAssessmentIdPatch(id, payload);
      return res.data as AssessmentResponse;
    },
    onSuccess: () => {
      setEditItem(null);
      qc.invalidateQueries({ queryKey: ['assessments', 'list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationKey: ['assessments', 'delete'],
    mutationFn: async (id: string) => {
      const res = await api.deleteAssessmentAssessmentsAssessmentIdDelete(id);
      return res.data;
    },
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['assessments', 'list'] });
    },
  });

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
        onSubmit={async (formData) => {
          await createMutation.mutateAsync(formData);
        }}
      />

      <AssessmentEditModal
        openItem={editItem}
        isSubmitting={updateMutation.isPending}
        error={updateMutation.isError ? updateMutation.error : null}
        onClose={() => setEditItem(null)}
        onSubmit={async (id, formData) => {
          await updateMutation.mutateAsync({ id, payload: formData });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} className="mt-2" />}
    </section>
  );
};

export default AssessmentsPage;