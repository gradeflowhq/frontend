import React from 'react';

import { useRuleEditorState } from '@features/rules/hooks/useRuleEditorState';

import RuleEditorForm from './RuleEditorForm';

import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '@features/rules/types';

interface Props {
  selectedRuleKey: string | null;
  initialRule?: RuleValue | null;
  questionId: string;
  questionType: string;
  questionMap?: QuestionSetOutputQuestionMap;
  onSave: (rule: RuleValue) => void;
  onCancel: () => void;
  isSaving?: boolean;
  error?: unknown;
  /**
   * Called on every draft change so parents (e.g. QuestionDetailPanel) can
   * drive a live grading preview with the current draft.
   */
  onDraftChange?: (draft: RuleValue) => void;
}

const InlineRuleEditor: React.FC<Props> = ({
  selectedRuleKey,
  initialRule,
  questionId,
  questionType,
  questionMap,
  onSave,
  onCancel,
  isSaving,
  error,
  onDraftChange,
}) => {
  const { draft, setDraft, schemaForRender, mergedUiSchema, concreteKey, hiddenKeys } =
    useRuleEditorState({
      selectedRuleKey,
      initialRule,
      questionId,
      questionType,
      questionMap,
    });

  // Keep parent in sync for live preview
  React.useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  return (
    <RuleEditorForm
      formKey={`rule:${concreteKey ?? 'unknown'}:${questionId}`}
      schemaForRender={schemaForRender}
      mergedUiSchema={mergedUiSchema}
      hiddenKeys={hiddenKeys}
      draft={draft}
      onDraftChange={setDraft}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      error={error}
    />
  );
};

export default InlineRuleEditor;