import React from 'react';

import { useRuleEditorState } from '@features/rules/hooks/useRuleEditorState';

import RuleEditorForm from './RuleEditorForm';

import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '@features/rules/types';

interface RuleEditorProps {
  formKeyBase: string;
  selectedRuleKey: string | null;
  initialRule?: RuleValue | null;
  questionId?: string | null;
  questionType?: string | null;
  questionMap?: QuestionSetOutputQuestionMap;
  onSave: (rule: RuleValue) => void;
  onCancel: () => void;
  isSaving?: boolean;
  error?: unknown;
  /**
   * Called when the editor materializes its initial draft. Kept intentionally
   * quiet after that so parent panels do not re-render on every field edit.
   */
  onDraftChange?: (draft: RuleValue) => void;
  onDraftEdit?: () => void;
  onDraftReaderChange?: (reader: (() => RuleValue | null) | null) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  formKeyBase,
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
  onDraftEdit,
  onDraftReaderChange,
}) => {
  const { draft, schemaForRender, mergedUiSchema, concreteKey, hiddenKeys } =
    useRuleEditorState({
      selectedRuleKey,
      initialRule,
      questionId,
      questionType,
      questionMap,
    });
  const draftRef = React.useRef(draft);

  React.useEffect(() => {
    draftRef.current = draft;
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  React.useEffect(() => {
    onDraftReaderChange?.(() => draftRef.current);
    return () => onDraftReaderChange?.(null);
  }, [onDraftReaderChange]);

  const handleDraftChange = React.useCallback(
    (next: RuleValue) => {
      draftRef.current = next;
      onDraftEdit?.();
    },
    [onDraftEdit],
  );

  return (
    <RuleEditorForm
      formKey={`${formKeyBase}:${concreteKey ?? 'unknown'}`}
      schemaForRender={schemaForRender}
      mergedUiSchema={mergedUiSchema}
      hiddenKeys={hiddenKeys}
      draft={draft}
      onDraftChange={handleDraftChange}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving}
      error={error}
    />
  );
};

export default RuleEditor;
