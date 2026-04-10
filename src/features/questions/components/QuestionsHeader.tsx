import { Group, TextInput, Menu, Button } from '@mantine/core';
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
  disabled?: boolean;
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
  disabled,
}) => {
  return (
    <Group gap="sm">
      {onSearchChange && (
        <TextInput
          leftSection={<IconSearch size={14} />}
          aria-label="Search questions"
          placeholder="Search questions"
          value={searchQuery ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
        />
      )}
      <Menu position="bottom-end">
        <Menu.Target>
          <Button size="sm" variant="default" rightSection={<IconChevronDown size={14} />} disabled={disabled}>
            Manage
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {showInfer && (
            <Menu.Item leftSection={<IconBolt size={16} />} onClick={onInfer} disabled={disabled} title="Infer question set from submissions">
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
  );
};

export default QuestionsHeader;
