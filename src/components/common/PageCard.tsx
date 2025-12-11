import React from 'react';

type PageCardProps = {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

const PageCard: React.FC<PageCardProps> = ({ title, children, footer, className }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className={`card w-full max-w-md bg-base-100 shadow-xl card-bordered ${className ?? ''}`}>
        <div className="card-body">
          <h2 className="card-title justify-center">{title}</h2>
          {children}
          {footer && <div className="card-actions justify-center pt-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default PageCard;