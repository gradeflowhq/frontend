import React from 'react';
import { Button } from '@components/ui/Button';
import { IconInfer, IconUpload } from '@components/ui/Icon';

type QuestionsHeaderProps = {
  onInfer: () => void;
  showInfer: boolean;
  onUpload?: () => void;
  onImport?: () => void;
};

const QuestionsHeader: React.FC<QuestionsHeaderProps> = ({
  onInfer,
  showInfer,
  onUpload,
  onImport,
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
      </div>
    </div>
  );
};

export default QuestionsHeader;