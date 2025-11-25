import React from 'react';
import { Button } from '@components/ui/Button';
import { IconInfer } from '@components/ui/Icon';

type QuestionsHeaderProps = {
  onInfer: () => void;
  showInfer: boolean;
};

const QuestionsHeader: React.FC<QuestionsHeaderProps> = ({ onInfer, showInfer }) => {
  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <h2 className="card-title">Questions</h2>
      {showInfer && (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onInfer} leftIcon={<IconInfer />}>
            Infer from Submissions
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestionsHeader;