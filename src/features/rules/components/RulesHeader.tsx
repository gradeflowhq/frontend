import { Group, Title, TextInput, Menu, Button } from '@mantine/core';
import { IconChevronDown, IconSearch, IconTrash, IconUpload } from '@tabler/icons-react';
import React from 'react';

type RulesHeaderProps = {
  onUpload?: () => void;
  onImport?: () => void;
  onDelete?: () => void;
  disableDelete?: boolean;
  hasRules?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  disabled?: boolean;
};

const RulesHeader: React.FC<RulesHeaderProps> = ({
  onUpload,
  onImport,
  onDelete,
  disableDelete,
  hasRules,
  searchQuery,
  onSearchChange,
  disabled = false,
}) => {
  return (
    <Group justify="space-between" mb="sm" wrap="wrap">
      <Title order={4}>Rules</Title>
      <Group gap="sm">
        {onSearchChange && (
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search rules"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled}
          />
        )}
        <Menu position="bottom-end">
          <Menu.Target>
            <Button variant="subtle" rightSection={<IconChevronDown size={16} />} disabled={disabled}>
              Manage
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconUpload size={16} />} onClick={disabled ? undefined : onUpload} disabled={disabled}>
              Upload
            </Menu.Item>
            <Menu.Item leftSection={<IconUpload size={16} />} onClick={disabled ? undefined : onImport} disabled={disabled}>
              Import
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={disabled ? undefined : onDelete}
              disabled={disabled || !hasRules || disableDelete}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
};

export default RulesHeader;
