import React from 'react';
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
            <svg
              className="h-4 w-4 opacity-70"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48"
          >
            <li>
              <button className="btn btn-ghost justify-start" onClick={onLogout}>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;