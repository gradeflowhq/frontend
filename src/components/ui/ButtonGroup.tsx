import React from 'react';
import clsx from 'clsx';

export const ButtonGroup: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => {
  return <div className={clsx('btn-group', className)}>{children}</div>;
};