import React, { forwardRef } from 'react';
import clsx from 'clsx';

type IconButtonProps = {
  variant?: 'ghost' | 'outline' | 'neutral' | 'primary' | 'secondary' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  title?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'sm', icon, title, className, disabled, onClick }, ref) => {
    const classes = clsx(
      'btn',
      variant === 'ghost' && 'btn-ghost',
      variant === 'outline' && 'btn-outline',
      variant === 'neutral' && 'btn-neutral',
      variant === 'primary' && 'btn-primary',
      variant === 'secondary' && 'btn-secondary',
      variant === 'error' && 'btn-error',
      size === 'xs' && 'btn-xs',
      size === 'sm' && 'btn-sm',
      size === 'md' && '',
      size === 'lg' && 'btn-lg',
      'px-2',
      className
    );
    return (
      <button ref={ref} className={classes} title={title} disabled={disabled} onClick={onClick}>
        {icon}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';