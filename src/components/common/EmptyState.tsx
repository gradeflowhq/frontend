import React from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action, className }) => {
  return (
    <div className={`hero rounded-box bg-base-200 py-12 ${className ?? ''}`}>
      <div className="hero-content text-center">
        <div className="max-w-md space-y-3">
          {icon && <div className="flex justify-center text-3xl">{icon}</div>}
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">{title}</h1>
          {description && <p className="opacity-70">{description}</p>}
          {action && <div className="flex justify-center">{action}</div>}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;