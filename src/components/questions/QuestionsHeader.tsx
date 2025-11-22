import React from 'react';

type QuestionsHeaderProps = {
  onInfer: () => void;
  showInfer: boolean;
};

const QuestionsHeader: React.FC<QuestionsHeaderProps> = ({
  onInfer, showInfer,
}) => {
  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <h2 className="card-title">Questions</h2>
      {showInfer && (
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={onInfer}>
          Infer from Submissions
        </button>
      </div>
      )}
    </div>
  );
};

export default QuestionsHeader;