import { Box } from '@mantine/core';
import React from 'react';

import InlineRulePreview from './InlineRulePreview';
import RuleRenderer from './RuleRenderer';

import type { RuleValue } from '../types';

interface RuleCardProps {
  rule: RuleValue;
  onEdit?: (rule: RuleValue) => void;
  onDelete?: (rule: RuleValue) => void;
  contextQuestionId?: string | null;
  /** When provided, renders an expandable inline preview panel below the rule. */
  assessmentId?: string;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  onEdit,
  onDelete,
  contextQuestionId,
  assessmentId,
}) => {
  return (
    <Box>
      <RuleRenderer
        value={rule}
        contextQuestionId={contextQuestionId}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {assessmentId && (
        <InlineRulePreview rule={rule} assessmentId={assessmentId} />
      )}
    </Box>
  );
};

export default RuleCard;