import React from 'react';
import { IconSettings, IconUsers, IconAssessment } from '@components/ui/Icon';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import { Button } from '@components/ui/Button';

type SettingsDropdownProps = {
  onEditAssessment: () => void;
  onOpenMembers: () => void; // optional: use dialog instead of route
};

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ onEditAssessment, onOpenMembers }) => {
  return (
    <DropdownMenu
      trigger={<>
        <span className="sr-only">Settings</span>
        <IconSettings />
      </>}
      align="end"
    >
      <li>
        <Button variant="ghost" className="justify-start" onClick={onEditAssessment} leftIcon={<IconAssessment />}>
          Assessment
        </Button>
      </li>
      <li>
        <Button variant="ghost" className="justify-start" onClick={onOpenMembers} leftIcon={<IconUsers />}>
          Members
        </Button>
      </li>
    </DropdownMenu>
  );
};

export default SettingsDropdown;