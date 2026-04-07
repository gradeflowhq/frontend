import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Menu,
  Modal,
  Progress,
  SimpleGrid,
  Skeleton,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconDots,
  IconGridDots,
  IconInbox,
  IconListCheck,
  IconPencil,
  IconPlus,
  IconQuestionMark,
  IconSearch,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import EmptyState from '@components/common/EmptyState';
import PageShell from '@components/common/PageShell';
import UpdatedAtBadge from '@components/common/UpdatedAtBadge';
import {
  useAssessmentsList,
  useCreateAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
} from '@features/assessments/api';
import {
  AssessmentCreateModal,
  AssessmentEditModal,
} from '@features/assessments/components';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';
import { compareDateDesc } from '@utils/sort';

import type { AssessmentResponse, AssessmentCreateRequest, AssessmentUpdateRequest } from '@api/models';

// A single card that renders from summary data already included in the list response
const AssessmentCard: React.FC<{
  item: AssessmentResponse;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMembers: () => void;
}> = ({ item, onOpen, onEdit, onDelete, onMembers }) => {
  const summary = item.summary;
  const cov = summary?.coverage;
  const covTotal = cov?.total ?? 0;
  const covCovered = cov?.covered ?? 0;
  const covPct = cov?.percentage ?? 0;
  const hasRules = covTotal > 0;

  const gradedCount = summary?.graded_count ?? 0;
  const submissionsCount = summary?.submission_count ?? null;
  const questionsCount = summary?.question_count ?? null;

  const covColor = covPct >= 1 ? 'green' : covPct > 0 ? 'yellow' : 'gray';

  return (
    <Card withBorder padding="md" radius="md" shadow="xs" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header: name + menu */}
      <Group justify="space-between" align="flex-start" mb="xs">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" truncate>{item.name}</Text>
          {item.description && (
            <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{item.description}</Text>
          )}
        </Box>
        <Menu position="bottom-end" withArrow>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm" aria-label="More options">
              <IconDots size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={onEdit}>Edit</Menu.Item>
            <Menu.Item leftSection={<IconUsers size={14} />} onClick={onMembers}>Manage Members</Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>Delete</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Coverage */}
      <Box mb="sm">
        {hasRules ? (
          <>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">{covCovered}/{covTotal} rules covered</Text>
              <Badge size="xs" variant="light" color={covColor}>
                {Math.round(covPct * 100)}%
              </Badge>
            </Group>
            <Progress value={covPct * 100} size="sm" radius="sm" color={covColor} />
          </>
        ) : (
          <Text size="xs" c="dimmed">No rules configured</Text>
        )}
      </Box>

      {/* Stats with icons */}
      <Group gap="sm" mb="md" wrap="wrap">
        <Tooltip label="Submissions" withArrow>
          <Group gap={4} align="center">
            <IconInbox size={13} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              {submissionsCount === null ? '—' : submissionsCount === 0 ? 'None' : submissionsCount}
            </Text>
          </Group>
        </Tooltip>
        <Tooltip label="Questions" withArrow>
          <Group gap={4} align="center">
            <IconQuestionMark size={13} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              {questionsCount === null ? '—' : questionsCount === 0 ? 'None' : questionsCount}
            </Text>
          </Group>
        </Tooltip>
        {gradedCount > 0 && (
          <Tooltip label="Graded submissions" withArrow>
            <Group gap={4} align="center">
              <IconListCheck size={13} color="var(--mantine-color-green-6)" />
              <Text size="xs" c="green.7">{gradedCount} graded</Text>
            </Group>
          </Tooltip>
        )}
      </Group>

      <Divider mb="sm" />

      {/* Footer: updated at + open button */}
      <Group justify="space-between" align="center">
        <UpdatedAtBadge updatedAt={item.updated_at} />
        <Button size="xs" variant="light" onClick={onOpen}>
          Open
        </Button>
      </Group>
    </Card>
  );
};

const AssessmentsPage: React.FC = () => {
  useDocumentTitle('Assessments - GradeFlow');

  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<AssessmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 200);

  

  const { data, isLoading, isError, error } = useAssessmentsList();
  const createMutation = useCreateAssessment();
  const updateMutation = useUpdateAssessment();
  const deleteMutation = useDeleteAssessment();

  const sortedItems = useMemo(() => {
    const list = (data as { items?: AssessmentResponse[] } | undefined)?.items ?? [];
    return [...list].sort(compareDateDesc((i) => i.updated_at ?? i.created_at ?? null));
  }, [data]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return sortedItems;
    return sortedItems.filter((item) => {
      const haystacks = [item.name, item.description].filter(Boolean).map((v) => v!.toLowerCase());
      return haystacks.some((text) => text.includes(q));
    });
  }, [sortedItems, debouncedSearch]);

  const openAssessment = (item: AssessmentResponse) => {
    void navigate(`/assessments/${item.id}/overview`);
  };

  return (
    <PageShell
      title="My Assessments"
      actions={
        <Group gap="xs" align="center">
          <TextInput
            leftSection={<IconSearch size={14} />}
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="sm"
            w={200}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={() => setShowCreate(true)}>
            New Assessment
          </Button>
        </Group>
      }
    >

      {isError && <Alert color="red" mb="md">{getErrorMessage(error)}</Alert>}

      {isLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} withBorder padding="md" radius="md">
              <Skeleton height={16} mb="sm" />
              <Skeleton height={12} mb="sm" width="60%" />
              <Skeleton height={8} mb="sm" />
              <Skeleton height={28} mt="md" />
            </Card>
          ))}
        </SimpleGrid>
      ) : !isError && filteredItems.length === 0 ? (
        <EmptyState
          icon={<IconGridDots size={48} opacity={0.3} />}
          title="No assessments yet"
          description="Create your first assessment to get started."
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={() => setShowCreate(true)}>
              New Assessment
            </Button>
          }
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {filteredItems.map((item) => (
            <AssessmentCard
              key={item.id}
              item={item}
              onOpen={() => openAssessment(item)}
              onEdit={() => setEditItem(item)}
              onDelete={() => setDeleteTarget(item)}
              onMembers={() => void navigate(`/assessments/${item.id}/members`)}
            />
          ))}
        </SimpleGrid>
      )}

      <AssessmentCreateModal
        open={showCreate}
        isSubmitting={createMutation.isPending}
        error={createMutation.isError ? createMutation.error : null}
        onClose={() => setShowCreate(false)}
        onSubmit={async (formData: AssessmentCreateRequest) => {
          const created = await createMutation.mutateAsync(formData);
          setShowCreate(false);
          notifications.show({ color: 'green', message: 'Assessment created' });
          void navigate(`/assessments/${created.id}/overview`);
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
          <Alert color="red" mt="sm">{getErrorMessage(deleteMutation.error)}</Alert>
        )}
      </Modal>
    </PageShell>
  );
};

export default AssessmentsPage;
