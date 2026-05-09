import React from 'react';

import { useRuleEditorState } from '@features/rules/hooks/useRuleEditorState';

import RuleEditorForm from './RuleEditorForm';

import type { RuleValue } from '@features/rules/types';

interface RuleEditorProps {
  formKeyBase: string;
  selectedRuleType: string | null;
  assessmentId: string;
  initialRule?: RuleValue | null;
  questionId?: string | null;
  path?: string | null;
  onSave: (rule: RuleValue) => void;
  onCancel: () => void;
  isSaving?: boolean;
  error?: unknown;
  onDraftChange?: (draft: RuleValue) => void;
  onDraftEdit?: () => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({
  formKeyBase,
  selectedRuleType,
  assessmentId,
  initialRule,
  questionId,
  path,
  onSave,
  onCancel,
  isSaving,
  error,
  onDraftChange,
  onDraftEdit,
}) => {
  const { draft, setDraft, schema, uiSchema, ruleType, isLoading, error: schemaError } =
    useRuleEditorState({
      assessmentId,
      selectedRuleType,
      initialRule,
      questionId,
      path,
    });

  React.useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const handleDraftChange = React.useCallback(
    (next: RuleValue) => {
      setDraft(next);
      onDraftEdit?.();
    },
    [onDraftEdit, setDraft],
  );

  return (
    <RuleEditorForm
      formKey={`${formKeyBase}:${ruleType ?? 'unknown'}`}
      schema={schema}
      uiSchema={uiSchema}
      draft={draft}
      formContext={{ assessmentId, questionId }}
      onDraftChange={handleDraftChange}
      onSave={onSave}
      onCancel={onCancel}
      isSaving={isSaving || isLoading}
      isLoading={isLoading}
      error={error ?? schemaError}
    />
  );
};

export default RuleEditor;
