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
};

const RulesHeader: React.FC<RulesHeaderProps> = ({
  onUpload,
  onImport,
  onDelete,
  disableDelete,
  hasRules,
  searchQuery,
  onSearchChange,
}) => {
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
            />
          </label>
        )}
        <DropdownMenu
          trigger={<span className="flex items-center gap-2"><span>Manage</span><IconChevronDown /></span>}
          align="end"
        >
          <li>
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={onUpload}
              leftIcon={<IconUpload />}
            >
              Upload
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="justify-start w-full"
              onClick={onImport}
              leftIcon={<IconUpload />}
            >
              Import
            </Button>
          </li>
          <li>
            <Button
              variant="error"
              className="justify-start w-full"
              onClick={onDelete}
              leftIcon={<IconTrash />}
              disabled={!hasRules || disableDelete}
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
