import React from 'react';

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
        <button type="button" className="btn" onClick={onLoadCsv}>
          Load from CSV
        </button>
        {showDeleteAll && (
        <button type="button" className="btn btn-error" onClick={onDeleteAll}>
          Delete All
        </button>
        )}
      </div>
    </div>
  );
};

export default SubmissionsHeader;