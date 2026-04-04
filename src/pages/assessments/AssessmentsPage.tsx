import { Button, Group, TextInput, Modal, Text, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@components/common/PageHeader';
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
import { getErrorMessages } from '@utils/error';
import { compareDateDesc } from '@utils/sort';

import type { AssessmentResponse, AssessmentCreateRequest, AssessmentUpdateRequest } from '@api/models';

const AssessmentsPage: React.FC = () => {
  useDocumentTitle('Assessments - GradeFlow');

  const navigate = useNavigate();

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
          <Group gap="sm" wrap="nowrap">
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Search assessments"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="default" onClick={() => setShowCreate(true)} leftSection={<IconPlus size={16} />}>
              Add
            </Button>
          </Group>
        }
      />
      {isError && <Alert color="red" mb="md">{getErrorMessages(error).join(' ')}</Alert>}

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
              notifications.show({ color: 'green', message: 'Assessment created' });
            },
            onError: () => notifications.show({ color: 'red', message: 'Create failed' }),
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
              notifications.show({ color: 'green', message: 'Assessment updated' });
            },
            onError: () => notifications.show({ color: 'red', message: 'Update failed' }),
          });
        }}
      />

      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Assessment"
      >
        <Text mb="md">Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="red"
            loading={deleteMutation.isPending}
            onClick={() =>
              deleteTarget &&
              deleteMutation.mutate(deleteTarget.id, {
                onSuccess: () => {
                  setDeleteTarget(null);
                  notifications.show({ color: 'green', message: 'Assessment deleted' });
                },
                onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
              })
            }
          >
            Delete
          </Button>
        </Group>
        {deleteMutation.isError && (
          <Alert color="red" mt="sm">{getErrorMessages(deleteMutation.error).join(' ')}</Alert>
        )}
      </Modal>
    </section>
  );
};

export default AssessmentsPage;
