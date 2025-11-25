import React from 'react';
import RuleRender from './RuleRender';
import type { RuleValue } from '../types';

type RuleItemProps = {
  rule: RuleValue;
  onEdit?: (rule: RuleValue) => void;
  onDelete?: (rule: RuleValue) => void;
  contextQuestionId?: string | null;
};

const RuleItem: React.FC<RuleItemProps> = ({ rule, onEdit, onDelete, contextQuestionId }) => {
  return (
    <RuleRender
      value={rule as any}
      contextQuestionId={contextQuestionId}
      onEdit={onEdit as any}
      onDelete={onDelete as any}
    />
  );
};

export default RuleItem;