import React from 'react';
import { Outlet } from 'react-router-dom';

import PublicNavbar from '@components/common/PublicNavbar';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
