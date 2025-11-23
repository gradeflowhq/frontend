import React from 'react';
import { IconSave } from '../ui/icons';
import { Button } from '../ui/Button';
import Modal from '../common/Modal';
import ErrorAlert from '../common/ErrorAlert';
import { SchemaForm } from '../common/SchemaForm';
import {
  HIDE_KEYS_SINGLE,
  HIDE_KEYS_MULTI,
} from '../../utils/rulesConstants';
import {
  getRuleDefinitions,
  friendlyRuleLabel,
  findSchemaKeyByType,
  isSingleTargetKey,
} from '../../utils/rulesHelpers';
import HiddenAwareFieldTemplate from './HiddenAwareFieldTemplate';

type RuleDialogProps = {
  open: boolean;
  selectedRuleKey: string | null;
  initialRule?: any | null;
  questionId?: string | null;
  questionType?: string | null;
  onClose: () => void;
  onSave: (rule: any) => Promise<void> | void;
  isSaving?: boolean;
  error?: unknown;
};

const RuleDialog: React.FC<RuleDialogProps> = ({
  open,
  selectedRuleKey,
  initialRule,
  questionId,
  questionType,
  onClose,
  onSave,
  isSaving,
  error,
}) => {
  if (!open) return null;

  const defs = getRuleDefinitions();
  const hiddenKeys = questionId ? [...HIDE_KEYS_SINGLE] : [...HIDE_KEYS_MULTI];

  // Eligible rule keys based on single/multi target and compatibility
  const eligibleKeys = Object.keys(defs).filter((key) => {
    const props = defs[key]?.properties ?? {};
    const qTypesDefault = props?.question_types?.default;
    const compatible =
      !questionType || (Array.isArray(qTypesDefault) ? qTypesDefault.includes(questionType) : true);
    return (questionId ? isSingleTargetKey(defs, key) : !isSingleTargetKey(defs, key)) && compatible;
  });

  // Resolve the rule schema to render
  let baseSchema: any = null;
  if (selectedRuleKey && defs[selectedRuleKey]) {
    baseSchema = defs[selectedRuleKey];
  } else if (initialRule?.type) {
    const matchKey = findSchemaKeyByType(defs, String(initialRule.type), !!questionId);
    if (matchKey) baseSchema = defs[matchKey];
  }
  if (!baseSchema) {
    const oneOf = eligibleKeys.map((k) => defs[k]).filter(Boolean);
    baseSchema = oneOf.length ? { oneOf } : null;
  }

  const [draft, setDraft] = React.useState<any>(() => {
    const base = initialRule ? { ...initialRule } : {};
    if (questionId) base.question_id = questionId;
    const constType =
      baseSchema?.properties?.type?.const ??
      baseSchema?.properties?.type?.default;
    if (constType) base.type = constType;
    return base;
  });

  React.useEffect(() => {
    const base = initialRule ? { ...initialRule } : {};
    if (questionId) base.question_id = questionId;
    const constType =
      baseSchema?.properties?.type?.const ??
      baseSchema?.properties?.type?.default;
    if (constType) base.type = constType;
    setDraft(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRuleKey, initialRule, questionId]);

  const schemaForRender = baseSchema ? { ...baseSchema, definitions: defs } : null;

  // Simple uiSchema: mark hidden keys with ui:options.hidden
  const uiSchema: Record<string, any> = {
    'ui:title': '',
    'ui:options': { label: true },
    'ui:submitButtonOptions': { norender: true },
  };

  for (const k of hiddenKeys) {
    uiSchema[k] = { 'ui:options': { hidden: true } };
  }

  // If you need nested hiding for common complex children in rule schemas, add paths here:
  // Example: hide constraints & question_types in array items if present
  // uiSchema.rules = { items: { constraints: { 'ui:options': { hidden: true } }, question_types: { 'ui:options': { hidden: true } } } };

  const templates = { FieldTemplate: HiddenAwareFieldTemplate };

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{initialRule ? 'Edit Rule' : 'Add Rule'}</h3>
        {selectedRuleKey && <span className="text-sm opacity-70">{friendlyRuleLabel(selectedRuleKey)}</span>}
      </div>

      {schemaForRender ? (
        <SchemaForm<any>
          schema={schemaForRender}
          uiSchema={uiSchema}
          formData={draft}
          onChange={({ formData }) => setDraft(formData)}
          onSubmit={async ({ formData }) => { await onSave(formData); }}
          formProps={{ noHtml5Validate: true }}
          showSubmit={false}
          templates={templates}
        />
      ) : (
        <div className="alert alert-warning mt-2"><span>Rule schema not found.</span></div>
      )}

      {error && <ErrorAlert error={error} className="mt-2" />}

      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={onClose} disabled={!!isSaving}>Cancel</Button>
        <Button type="button" variant="primary" onClick={() => onSave(draft)} disabled={!!isSaving || !schemaForRender} loading={!!isSaving} leftIcon={<IconSave />}>
          Save
        </Button>
      </div>
    </Modal>
  );
};

export default RuleDialog;