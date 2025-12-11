import React from 'react';
import { IconChevronDown, IconLogOut, IconSettings } from '../ui/Icon';
import { Link } from 'react-router-dom';
import { DropdownMenu } from '../ui/DropdownMenu';

type NavbarProps = {
  username: string;
  onLogout: () => void;
  onOpenSettings?: () => void;
};

const Navbar: React.FC<NavbarProps> = ({ username, onLogout, onOpenSettings }) => {
  return (
    <div className="navbar bg-base-100 border-b border-base-300">
      <div className="flex-1">
        <Link to="/assessments" className="btn btn-ghost normal-case text-xl">
          GradeFlow
        </Link>
      </div>
      <div className="flex-none">
        <DropdownMenu
          align="end"
          trigger={
            <>
              {username}
              <IconChevronDown />
            </>
          }
        >
          {onOpenSettings && (
            <li>
              <button className="justify-start" onClick={onOpenSettings}>
                <IconSettings />
                Settings
              </button>
            </li>
          )}
          <li>
            <button className="justify-start" onClick={onLogout}>
              <IconLogOut />
              Logout
            </button>
          </li>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Navbar;