import React from 'react';
import clsx from 'clsx';

type DropdownMenuProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end';           // horizontal alignment
  position?: 'top' | 'bottom';       // vertical positioning (DaisyUI: dropdown-top)
  className?: string;
  isItemList?: boolean;
};

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'end',
  position = 'bottom',
  className,
  isItemList = true,
}) => {
  const dropdownClass = clsx(
    'dropdown',
    align === 'end' && 'dropdown-end',
    position === 'top' && 'dropdown-top',
    className
  );

  return (
    <div className={dropdownClass}>
      <div tabIndex={0} role="button" className="btn btn-ghost">
        {trigger}
      </div>
      {isItemList ? (
        <ul
          tabIndex={0}
          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-64 z-50"
        >
          {children}
        </ul>
      ) : (
        <div tabIndex={0} className="dropdown-content z-50">
          {children}
        </div>
      )}
    </div>
  );
};