import React from 'react';
import { Button } from '@components/ui/Button';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import { IconUpload, IconTrash, IconSearch, IconChevronDown } from '@components/ui/Icon';

type SubmissionsHeaderProps = {
  onLoadCsv: () => void;
  onDeleteAll: () => void;
  showDeleteAll: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
};

const SubmissionsHeader: React.FC<SubmissionsHeaderProps> = ({
  onLoadCsv,
  onDeleteAll,
  showDeleteAll,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <h2 className="card-title">Submissions</h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {onSearchChange && (
          <label className="input input-bordered flex items-center gap-2">
            <IconSearch className="h-4 w-4 opacity-60" />
            <input
              type="search"
              className="w-full grow bg-transparent focus:outline-none"
              placeholder="Search by Student ID"
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
            <Button type="button" variant="ghost" className="justify-start w-full" onClick={onLoadCsv} leftIcon={<IconUpload />}>
              Import
            </Button>
          </li>
          {showDeleteAll && (
            <li>
              <Button type="button" variant="error" className="justify-start w-full" onClick={onDeleteAll} leftIcon={<IconTrash />}>
                Delete
              </Button>
            </li>
          )}
        </DropdownMenu>
      </div>
    </div>
  );
};

export default SubmissionsHeader;