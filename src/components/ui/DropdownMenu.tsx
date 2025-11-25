import React, { useState } from 'react';
import clsx from 'clsx';

type DropdownMenuProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end'; // DaisyUI: dropdown-end
  className?: string;
};

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, children, align = 'end', className }) => {
  const [open, setOpen] = useState(false);
  const dropdownClass = clsx('dropdown', align === 'end' && 'dropdown-end', open && 'dropdown-open', className);

  const closeOnBlur = () => setTimeout(() => setOpen(false), 100);

  return (
    <div className={dropdownClass}>
      <button tabIndex={0} className="btn btn-ghost" onClick={() => setOpen(o => !o)} onBlur={closeOnBlur}>
        {trigger}
      </button>
      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-50 z-50">
        {children}
      </ul>
    </div>
  );
};