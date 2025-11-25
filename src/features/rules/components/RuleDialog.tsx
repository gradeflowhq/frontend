import React from 'react';
import { IconSave } from '@components/ui/Icon';
import { Button } from '@components/ui/Button';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import { HIDE_KEYS_SINGLE, HIDE_KEYS_MULTI } from '../constants';

import { useRuleDefinitions, useCompatibleRuleKeys, useFindSchemaKeyByType } from '../hooks';
import { friendlyRuleLabel } from '../helpers';
import { enrichSchemaByConstraints } from '../helpers/constraints';
import { augmentRulesSchemaWithQuestionIdEnums } from '../helpers/augmentations';

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

const materializeDraftFromSchema = (schema: any, questionId?: string | null, initial?: any) => {
  const props = schema?.properties ?? {};
  const out: Record<string, any> = { ...(initial ?? {}) };

  const typeConst = props?.type?.const ?? props?.type?.default;
  if (typeConst) out.type = typeConst;

  if (props?.question_id && questionId) out.question_id = questionId;

  Object.entries<any>(props).forEach(([k, p]) => {
    if (out[k] !== undefined || k === 'type' || k === 'question_id') return;
    if (p.type === 'array') out[k] = Array.isArray(p.default) ? p.default : [];
    else if (['number', 'integer', 'string', 'boolean'].includes(p.type) && p.default !== undefined) out[k] = p.default;
  });

  return out;
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
  // Base definitions from schema file
  const defs = useRuleDefinitions();

  // Narrow eligible schema keys for current context
  const eligibleKeys = useCompatibleRuleKeys(defs, questionType as any, !!questionId);
  const findKeyByType = useFindSchemaKeyByType(defs);

  // Augment rule definitions with compatible question_id enums
  const augmentedDefs = React.useMemo(() => {
    if (!questionMap) return defs;
    // augmentRulesSchemaWithQuestionIdEnums expects the rules definitions object and a map of question_id -> schema
    return augmentRulesSchemaWithQuestionIdEnums(defs as any, questionMap as any) as Record<string, any>;
  }, [defs, questionMap]);

  // Resolve concrete schema key (prefer selected key, else infer from initial rule type)
  const concreteKey = React.useMemo(() => {
    if (selectedRuleKey && augmentedDefs[selectedRuleKey]) return selectedRuleKey;
    const initType = (initialRule as any)?.type;
    if (initType) {
      const k = findKeyByType(String(initType), !!questionId);
      if (k) return k;
    }
    return eligibleKeys[0] ?? null;
  }, [augmentedDefs, selectedRuleKey, initialRule, eligibleKeys, findKeyByType, questionId]);

  // Pick the base schema for the selected rule, from augmented defs
  const baseSchema = React.useMemo(
    () => (concreteKey ? augmentedDefs[concreteKey] : null),
    [augmentedDefs, concreteKey]
  );

  const [draft, setDraft] = React.useState<any>(() => {
    return baseSchema ? materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}) : (initialRule ?? {});
  });

  React.useEffect(() => {
    if (!baseSchema) return;
    setDraft(materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSchema, questionId]);

  const hiddenKeys = React.useMemo(() => (questionId ? [...HIDE_KEYS_SINGLE] : [...HIDE_KEYS_MULTI]), [questionId]);

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

    // Enrich dynamic fields from constraints; ensure we pass augmented definitions
    const enriched =
      questionMap
        ? enrichSchemaByConstraints(baseSchema, augmentedDefs, draft, questionMap, questionId)
        : { schema: baseSchema, definitions: augmentedDefs, uiSchema: {} };

    // Attach augmented definitions so question_id has the compatible enum
    const schemaWithDefs = { ...enriched.schema, definitions: augmentedDefs };

    const mergedUi = { ...baseUi };
    Object.entries(enriched.uiSchema).forEach(([key, val]) => {
      const isHidden = mergedUi[key]?.['ui:options']?.hidden === true;
      if (!isHidden) mergedUi[key] = { ...(mergedUi[key] ?? {}), ...val };
    });

    return { schemaForRender: schemaWithDefs, mergedUiSchema: mergedUi };
  }, [baseSchema, augmentedDefs, draft, questionMap, questionId, hiddenKeys]);

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
        <Button
          type="button"
          variant="primary"
          onClick={() => onSave(draft as RuleValue)}
          disabled={!!isSaving || !schemaForRender}
          loading={!!isSaving}
          leftIcon={<IconSave />}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
};

export default RuleDialog;