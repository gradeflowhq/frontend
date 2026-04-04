import { ActionIcon, Menu } from '@mantine/core';
import { IconFileText, IconLock, IconSettings, IconUsers } from '@tabler/icons-react';
import React from 'react';

type SettingsDropdownProps = {
  onEditAssessment: () => void;
  onOpenMembers: () => void;
  onForgetPassphrase?: () => void;
  showForgetPassphrase?: boolean;
};

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  onEditAssessment,
  onOpenMembers,
  onForgetPassphrase,
  showForgetPassphrase,
}) => {
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="outline" size="lg" aria-label="Settings">
          <IconSettings size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconFileText size={14} />} onClick={onEditAssessment}>
          Assessment
        </Menu.Item>
        <Menu.Item leftSection={<IconUsers size={14} />} onClick={onOpenMembers}>
          Members
        </Menu.Item>
        {showForgetPassphrase && onForgetPassphrase && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconLock size={14} />}
              onClick={onForgetPassphrase}
            >
              Forget Passphrase
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
};

export default SettingsDropdown;
