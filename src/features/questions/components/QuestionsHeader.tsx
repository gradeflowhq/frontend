import { Group, Title, TextInput, Menu, Button } from '@mantine/core';
import { IconBolt, IconChevronDown, IconSearch, IconTrash, IconUpload } from '@tabler/icons-react';
import React from 'react';

type QuestionsHeaderProps = {
  onInfer: () => void;
  showInfer: boolean;
  onUpload?: () => void;
  onImport?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  disableDelete?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
};

const QuestionsHeader: React.FC<QuestionsHeaderProps> = ({
  onInfer,
  showInfer,
  onUpload,
  onImport,
  onDelete,
  showDelete,
  disableDelete,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <Group justify="space-between" mb="sm" wrap="wrap">
      <Title order={4}>Questions</Title>
      <Group gap="sm">
        {onSearchChange && (
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search questions"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}
        <Menu position="bottom-end">
          <Menu.Target>
            <Button variant="subtle" rightSection={<IconChevronDown size={16} />}>
              Manage
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {showInfer && (
              <Menu.Item leftSection={<IconBolt size={16} />} onClick={onInfer} title="Infer question set from submissions">
                Infer from Submissions
              </Menu.Item>
            )}
            <Menu.Item leftSection={<IconUpload size={16} />} onClick={onUpload} title="Upload Question Set">
              Upload
            </Menu.Item>
            <Menu.Item leftSection={<IconUpload size={16} />} onClick={onImport} title="Import Question Set">
              Import
            </Menu.Item>
            {showDelete && (
              <>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={onDelete}
                  disabled={disableDelete}
                  title="Delete Question Set"
                >
                  Delete
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
};

export default QuestionsHeader;
