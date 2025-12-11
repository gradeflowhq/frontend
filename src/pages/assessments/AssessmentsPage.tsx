import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ConfirmDialog from '@components/common/ConfirmDialog';
import ErrorAlert from '@components/common/ErrorAlert';
import PageHeader from '@components/common/PageHeader';
import { Button } from '@components/ui/Button';
import { IconPlus, IconSearch } from '@components/ui/Icon';
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
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { compareDateDesc } from '@utils/sort';
import { useToast } from '@components/common/ToastProvider';
import type { AssessmentResponse, AssessmentCreateRequest, AssessmentUpdateRequest } from '@api/models';

const AssessmentsPage: React.FC = () => {
  useDocumentTitle('Assessments - GradeFlow');

  const navigate = useNavigate();
  const toast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<AssessmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, error } = useAssessmentsList();
  const createMutation = useCreateAssessment();
  const updateMutation = useUpdateAssessment();
  const deleteMutation = useDeleteAssessment();

  const sortedItems = useMemo(() => {
    const list = (data as { items?: AssessmentResponse[] } | undefined)?.items ?? [];
    return [...list].sort(compareDateDesc((i) => i.updated_at ?? i.created_at ?? null));
  }, [data]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedItems;

    return sortedItems.filter((item) => {
      const haystacks = [item.name, item.description].filter(Boolean).map((v) => v!.toLowerCase());
      return haystacks.some((text) => text.includes(q));
    });
  }, [sortedItems, searchQuery]);

  return (
    <section>
      <PageHeader
        title="Assessments"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="input input-bordered flex items-center gap-2">
              <IconSearch className="h-4 w-4 opacity-60" />
              <input
                type="search"
                className="w-full grow bg-transparent focus:outline-none"
                placeholder="Search assessments"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <Button variant="ghost" onClick={() => setShowCreate(true)} leftIcon={<IconPlus />}>
              Add
            </Button>
          </div>
        }
      />
      {isError && <ErrorAlert error={error} />}

      {!isError && (
        <AssessmentsTable
          items={filteredItems}
          isLoading={isLoading}
          onOpen={(item) => {
            void navigate(`/assessments/${item.id}`);
          }}
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
          await createMutation.mutateAsync(formData, {
            onSuccess: () => {
              setShowCreate(false);
              toast.success('Assessment created');
            },
            onError: () => toast.error('Create failed'),
          });
        }}
      />

      <AssessmentEditModal
        openItem={editItem}
        isSubmitting={updateMutation.isPending}
        error={updateMutation.isError ? updateMutation.error : null}
        onClose={() => setEditItem(null)}
        onSubmit={async (id: string, formData: AssessmentUpdateRequest) => {
          await updateMutation.mutateAsync({ id, payload: formData }, {
            onSuccess: () => {
              setEditItem(null);
              toast.success('Assessment updated');
            },
            onError: () => toast.error('Update failed'),
          });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLoading={deleteMutation.isPending}
        confirmLoadingLabel="Deleting..."
        confirmText="Delete"
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              toast.success('Assessment deleted');
            },
            onError: () => toast.error('Delete failed'),
          })
        }
        onCancel={() => setDeleteTarget(null)}
      />
      {deleteMutation.isError && <ErrorAlert error={deleteMutation.error} className="mt-2" />}
    </section>
  );
};

export default AssessmentsPage;