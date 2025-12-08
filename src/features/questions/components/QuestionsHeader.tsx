import React from 'react';
import { Button } from '@components/ui/Button';
import { IconInfer, IconUpload, IconTrash } from '@components/ui/Icon';

type QuestionsHeaderProps = {
  onInfer: () => void;
  showInfer: boolean;
  onUpload?: () => void;
  onImport?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  disableDelete?: boolean;
};

const QuestionsHeader: React.FC<QuestionsHeaderProps> = ({
  onInfer,
  showInfer,
  onUpload,
  onImport,
  onDelete,
  showDelete,
  disableDelete,
}) => {
  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <h2 className="card-title">Questions</h2>
      <div className="flex gap-2">
        {showInfer && (
          <Button
            type="button"
            variant="ghost"
            onClick={onInfer}
            leftIcon={<IconInfer />}
            title="Infer question set from submissions"
          >
            Infer from Submissions
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={onUpload}
          leftIcon={<IconUpload />}
          title="Upload Question Set"
        >
          Upload
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onImport}
          leftIcon={<IconUpload />}
          title="Import Question Set"
        >
          Import
        </Button>
        {showDelete && (
          <Button
            type="button"
            variant="error"
            onClick={onDelete}
            leftIcon={<IconTrash />}
            disabled={disableDelete}
            title="Delete Question Set"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuestionsHeader;