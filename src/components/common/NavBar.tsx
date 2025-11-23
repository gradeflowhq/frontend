import React from 'react';
import { IconChevronDown, IconLogOut } from '../ui/icons';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

type NavbarProps = {
  username: string;
  onLogout: () => void;
};

const Navbar: React.FC<NavbarProps> = ({ username, onLogout }) => {
  return (
    <div className="navbar bg-base-100 border-b border-base-300">
      <div className="flex-1">
        <Link to="/assessments" className="btn btn-ghost normal-case text-xl">
          GradeFlow
        </Link>
      </div>
      <div className="flex-none">
        <div className="dropdown dropdown-end">
          <label tabIndex={0} className="btn btn-ghost">
            <span className="mr-2">{username}</span>
            <IconChevronDown />
          </label>
            <ul
            tabIndex={0}
            className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48"
          >
            <li>
              <Button variant="ghost" className="justify-start" onClick={onLogout} leftIcon={<IconLogOut />}>
                Logout
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;