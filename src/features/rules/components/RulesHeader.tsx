import React from 'react';

import { Button } from '@components/ui/Button';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import { IconChevronDown, IconUpload, IconTrash, IconSearch } from '@components/ui/Icon';

type RulesHeaderProps = {
  onUpload?: () => void;
  onImport?: () => void;
  onDelete?: () => void;
  disableDelete?: boolean;
  hasRules?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  disabled?: boolean;
};

const RulesHeader: React.FC<RulesHeaderProps> = ({
  onUpload,
  onImport,
  onDelete,
  disableDelete,
  hasRules,
  searchQuery,
  onSearchChange,
  disabled = false,
}) => {
  const handleUpload = disabled ? undefined : onUpload;
  const handleImport = disabled ? undefined : onImport;
  const handleDelete = disabled ? undefined : onDelete;

  return (
    <div className="mb-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <h2 className="text-lg font-semibold">Rules</h2>
      <div className="flex items-center gap-2">
        {onSearchChange && (
          <label className="input input-bordered flex items-center gap-2">
            <IconSearch className="h-4 w-4 opacity-60" />
            <input
              type="search"
              className="w-full grow bg-transparent focus:outline-none"
              placeholder="Search rules"
              value={searchQuery ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={disabled}
            />
          </label>
        )}
        <DropdownMenu
          trigger={<>Manage<IconChevronDown /></>}
          align="end"
        >
          <li>
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={handleUpload}
              leftIcon={<IconUpload />}
              disabled={disabled}
            >
              Upload
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={handleImport}
              leftIcon={<IconUpload />}
              disabled={disabled}
            >
              Import
            </Button>
          </li>
          <li>
            <Button
              variant="error"
              className="justify-start w-full"
              onClick={handleDelete}
              leftIcon={<IconTrash />}
              disabled={disabled || !hasRules || disableDelete}
            >
              Delete
            </Button>
          </li>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default RulesHeader;
