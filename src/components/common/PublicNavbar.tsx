import React from 'react';
import { Link } from 'react-router-dom';

const PublicNavbar: React.FC = () => {
  return (
    <div className="navbar bg-base-100 border-b border-base-300">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-xl">
          GradeFlow
        </Link>
      </div>
      <div className="flex-none gap-2 mr-5">
        <Link to="/login" className="btn btn-outline btn-sm mr-2">
          Log in
        </Link>
        <Link to="/register" className="btn btn-primary btn-sm">
          Register
        </Link>
      </div>
    </div>
  );
};

export default PublicNavbar;
