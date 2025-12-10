import React from 'react';

export type InfoRowProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export const InfoRow: React.FC<InfoRowProps> = ({ title, description, action, children }) => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && <p className="text-sm text-base-content/70">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  </div>
);

export const LoadingBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="badge badge-ghost gap-2">
    <span className="loading loading-spinner loading-xs" />
    {label}
  </span>
);
