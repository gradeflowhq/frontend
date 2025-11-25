import React from 'react';
import { Button } from '@components/ui/Button';
import { IconUpload, IconTrash } from '@components/ui/Icon';

type SubmissionsHeaderProps = {
  onLoadCsv: () => void;
  onDeleteAll: () => void;
  showDeleteAll: boolean;
};

const SubmissionsHeader: React.FC<SubmissionsHeaderProps> = ({
  onLoadCsv,
  onDeleteAll,
  showDeleteAll,
}) => {
  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <h2 className="card-title">Submissions</h2>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onLoadCsv} leftIcon={<IconUpload />}>
          Load from CSV
        </Button>
        {showDeleteAll && (
          <Button type="button" variant="error" onClick={onDeleteAll} leftIcon={<IconTrash />}>
            Delete All
          </Button>
        )}
      </div>
    </div>
  );
};

export default SubmissionsHeader;