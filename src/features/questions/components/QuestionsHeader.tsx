import React from 'react';
import { Button } from '@components/ui/Button';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import { IconChevronDown, IconInfer, IconUpload, IconTrash, IconSearch } from '@components/ui/Icon';

type QuestionsHeaderProps = {
  onInfer: () => void;
  showInfer: boolean;
  onUpload?: () => void;
  onImport?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  disableDelete?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
};

const QuestionsHeader: React.FC<QuestionsHeaderProps> = ({
  onInfer,
  showInfer,
  onUpload,
  onImport,
  onDelete,
  showDelete,
  disableDelete,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="mb-2 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <h2 className="card-title">Questions</h2>
      <div className="flex gap-2 items-center">
        {onSearchChange && (
          <label className="input input-bordered flex items-center gap-2">
            <IconSearch className="h-4 w-4 opacity-60" />
            <input
              type="search"
              className="w-full grow bg-transparent focus:outline-none"
              placeholder="Search questions"
              value={searchQuery ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>
        )}
        <DropdownMenu
          trigger={<>Manage<IconChevronDown /></>}
          align="end"
        >
          {showInfer && (
            <li>
              <Button
                type="button"
                variant="ghost"
                className="justify-start w-full"
                onClick={onInfer}
                leftIcon={<IconInfer />}
                title="Infer question set from submissions"
              >
                Infer from Submissions
              </Button>
            </li>
          )}
          <li>
            <Button
              type="button"
              variant="ghost"
              className="justify-start w-full"
              onClick={onUpload}
              leftIcon={<IconUpload />}
              title="Upload Question Set"
            >
              Upload
            </Button>
          </li>
          <li>
            <Button
              type="button"
              variant="ghost"
              className="justify-start w-full"
              onClick={onImport}
              leftIcon={<IconUpload />}
              title="Import Question Set"
            >
              Import
            </Button>
          </li>
          {showDelete && (
            <li>
              <Button
                type="button"
                variant="error"
                className="justify-start w-full"
                onClick={onDelete}
                leftIcon={<IconTrash />}
                disabled={disableDelete}
                title="Delete Question Set"
              >
                Delete
              </Button>
            </li>
          )}
        </DropdownMenu>
      </div>
    </div>
  );
};

export default QuestionsHeader;