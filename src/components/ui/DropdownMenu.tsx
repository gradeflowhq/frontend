import React, { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const dropdownClass = clsx(
    'dropdown',
    align === 'end' && 'dropdown-end',
    position === 'top' && 'dropdown-top',
    open && 'dropdown-open',
    className
  );

  const closeOnBlur = () => setTimeout(() => setOpen(false), 100);

  return (
    <div className={dropdownClass}>
      <button
        tabIndex={0}
        className="btn btn-ghost"
        onClick={() => setOpen((o) => !o)}
        onBlur={closeOnBlur}
      >
        {trigger}
      </button>
      {isItemList ? (
        <ul
          tabIndex={0}
          className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-64 z-50"
        >
          {children}
        </ul>
      ) : (
        <>{children}</>
      )}
    </div>
  );
};