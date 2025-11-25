import React from 'react';
import { IconSave } from '@components/ui/Icon';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import { HIDE_KEYS_SINGLE, HIDE_KEYS_MULTI } from '../constants';

import { useRuleDefinitions, useCompatibleRuleKeys, useFindSchemaKeyByType } from '../hooks';
import { friendlyRuleLabel } from '../helpers';
import { augmentRulesSchemaWithQuestionIdEnums } from '../helpers/augmentations';
import { injectEnumsFromConstraintsForQuestion } from '../helpers/constraints';

import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '../types';

type RuleDialogProps = {
  open: boolean;
  selectedRuleKey: string | null;
  initialRule?: RuleValue | null;
  questionId?: string | null;
  questionType?: string | null;
  questionMap?: QuestionSetOutputQuestionMap;
  onClose: () => void;
  onSave: (rule: RuleValue | any) => Promise<void> | void;
  isSaving?: boolean;
  error?: unknown;
};

// Seed essential fields RJSF won’t infer on its own
const materializeDraftFromSchema = (schema: any, questionId?: string | null, initial?: any) => {
  const props = schema?.properties ?? {};
  const draft: Record<string, any> = { ...(initial ?? {}) };

  const typeConst = props?.type?.const ?? props?.type?.default;
  if (typeConst !== undefined && draft.type === undefined) draft.type = typeConst;

  if (props?.question_id && questionId && draft.question_id === undefined) {
    draft.question_id = questionId;
  }

  return draft;
};

const RuleDialog: React.FC<RuleDialogProps> = ({
  open,
  selectedRuleKey,
  initialRule,
  questionId,
  questionType,
  questionMap,
  onClose,
  onSave,
  isSaving,
  error,
}) => {
  // 1) Base rule definitions from schema file
  const defs = useRuleDefinitions();

  // 2) Determine eligible rule types for context
  const eligibleKeys = useCompatibleRuleKeys(defs, questionType as any, !!questionId);
  const findKeyByType = useFindSchemaKeyByType(defs);

  // 3) First augmentation: restrict question_id enums by rule.question_types
  const defsWithQidEnums = React.useMemo(() => {
    if (!questionMap) return defs;
    return augmentRulesSchemaWithQuestionIdEnums(defs as any, questionMap as any) as Record<string, any>;
  }, [defs, questionMap]);

  // 4) Second augmentation: inject enums from constraints.default for the specific questionId
  const injectedDefs = React.useMemo(() => {
    if (!questionMap || !questionId) return defsWithQidEnums;
    return injectEnumsFromConstraintsForQuestion(
      defsWithQidEnums as any,
      questionMap as any,
      questionId
    ) as Record<string, any>;
  }, [defsWithQidEnums, questionMap, questionId]);

  // 5) Resolve concrete rule schema key
  const concreteKey = React.useMemo(() => {
    if (selectedRuleKey && injectedDefs[selectedRuleKey]) return selectedRuleKey;
    const initType = (initialRule as any)?.type;
    if (initType) {
      const k = findKeyByType(String(initType), !!questionId);
      if (k) return k;
    }
    return eligibleKeys[0] ?? null;
  }, [injectedDefs, selectedRuleKey, initialRule, eligibleKeys, findKeyByType, questionId]);

  // 6) Pick base schema from injected defs
  const baseSchema = React.useMemo(
    () => (concreteKey ? injectedDefs[concreteKey] : null),
    [injectedDefs, concreteKey]
  );

  // 7) Draft form data
  const [draft, setDraft] = React.useState<any>(() => {
    return baseSchema ? materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}) : (initialRule ?? {});
  });
  React.useEffect(() => {
    if (!baseSchema) return;
    setDraft(materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSchema, questionId]);

  // 8) Hide boilerplate fields in UI
  const hiddenKeys = React.useMemo(() => (questionId ? [...HIDE_KEYS_SINGLE] : [...HIDE_KEYS_MULTI]), [questionId]);

  // 9) Compose final schema (attach injected definitions) and UI schema
  const computed = React.useMemo(() => {
    const baseUi: Record<string, any> = {
      'ui:title': '',
      'ui:options': { label: true },
      'ui:submitButtonOptions': { norender: true },
    };
    hiddenKeys.forEach((k) => {
      baseUi[k] = { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } };
    });

    if (!baseSchema) return { schemaForRender: null as any, mergedUiSchema: baseUi };

    const schemaWithDefs = { ...baseSchema, definitions: injectedDefs };
    return { schemaForRender: schemaWithDefs, mergedUiSchema: baseUi };
  }, [baseSchema, injectedDefs, hiddenKeys]);

  const templates = React.useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate }), []);

  if (!open) return null;

  const { schemaForRender, mergedUiSchema } = computed;

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">
          {questionId && <span className="badge badge-ghost mr-2 mb-1">{questionId}</span>}
          {initialRule ? 'Edit Rule' : 'Add Rule'}
        </h3>
        {concreteKey && <span className="text-sm opacity-70">{friendlyRuleLabel(concreteKey)}</span>}
      </div>

      {schemaForRender ? (
        <SchemaForm<any>
          key={`rule:${concreteKey ?? 'unknown'}:${questionId ?? ''}`}
          schema={schemaForRender}
          uiSchema={mergedUiSchema}
          formData={draft}
          onChange={({ formData }) => setDraft(formData)}
          onSubmit={async ({ formData }) => { await onSave(formData as RuleValue); }}
          formProps={{ noHtml5Validate: true }}
          showSubmit={false}
          templates={templates}
          formContext={{ hideKeys: new Set(hiddenKeys) }}
        />
      ) : (
        <div className="alert alert-warning mt-2"><span>Rule schema not found.</span></div>
      )}

      {error && <ErrorAlert error={error} className="mt-2" />}

      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={onClose} disabled={!!isSaving}>Cancel</Button>
        <LoadingButton
          type="button"
          variant="primary"
          onClick={() => onSave(draft as RuleValue)}
          disabled={!schemaForRender}
          isLoading={!!isSaving}
          leftIcon={<IconSave />}
        >
          Save
        </LoadingButton>
      </div>
    </Modal>
  );
};

export default RuleDialog;