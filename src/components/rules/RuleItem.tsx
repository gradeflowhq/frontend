import React from 'react';
import RuleRender from './RuleRender';

type RuleItemProps = {
  rule: any;
  onEdit?: (rule: any) => void;
  onDelete?: (rule: any) => void;
  contextQuestionId?: string | null;
};

const RuleItem: React.FC<RuleItemProps> = ({ rule, onEdit, onDelete, contextQuestionId }) => {
  return (
    <RuleRender
      value={rule}
      contextQuestionId={contextQuestionId}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default RuleItem;