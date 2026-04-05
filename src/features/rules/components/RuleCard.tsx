import React from 'react';

import RuleRenderer from './RuleRenderer';

import type { RuleValue } from '../types';

type RuleCardProps = {
  rule: RuleValue;
  onEdit?: (rule: RuleValue) => void;
  onDelete?: (rule: RuleValue) => void;
  contextQuestionId?: string | null;
};

const RuleCard: React.FC<RuleCardProps> = ({ rule, onEdit, onDelete, contextQuestionId }) => {
  return (
    <RuleRenderer
      value={rule}
      contextQuestionId={contextQuestionId}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default RuleCard;