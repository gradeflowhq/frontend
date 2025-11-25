import React from 'react';
import { IconSettings, IconUsers, IconAssessment, IconLock } from '@components/ui/Icon';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import { Button } from '@components/ui/Button';

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
    <DropdownMenu
      trigger={
        <>
          <span className="sr-only">Settings</span>
          <IconSettings />
        </>
      }
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
      {showForgetPassphrase && onForgetPassphrase && (
        <li>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={onForgetPassphrase}
            leftIcon={<IconLock />}
            title="Forget locally stored passphrase"
          >
            Forget Passphrase
          </Button>
        </li>
      )}
    </DropdownMenu>
  );
};

export default SettingsDropdown;