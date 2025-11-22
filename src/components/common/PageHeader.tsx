import React from 'react';

type PageHeaderProps = {
  title: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, actions, breadcrumbs }) => {
  return (
    <div className="mb-4">
      {breadcrumbs && <div className="text-sm mb-2 opacity-70">{breadcrumbs}</div>}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {actions}
      </div>
    </div>
  );
};

export default PageHeader;