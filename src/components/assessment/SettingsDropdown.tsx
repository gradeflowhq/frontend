import React from 'react';
import { Link } from 'react-router-dom';

type SettingsDropdownProps = {
  assessmentId: string;
  onEditAssessment: () => void;
  onOpenMembers: () => void; // optional: use dialog instead of route
};

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ assessmentId, onEditAssessment, onOpenMembers }) => {
  return (
    <div className="dropdown dropdown-end">
      {/* Make the trigger focusable */}
      <button tabIndex={0} className="btn btn-ghost">
        Settings
      </button>
      {/* Make the content focusable */}
      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-44">
        <li>
          <button className="btn btn-ghost justify-start" onClick={onEditAssessment}>
            Assessment
          </button>
        </li>
        <li>
          <button className="btn btn-ghost justify-start" onClick={onOpenMembers}>
            Members
          </button>
        </li>
      </ul>
    </div>
  );
};

export default SettingsDropdown;