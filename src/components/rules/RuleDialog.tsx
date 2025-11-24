import React from 'react';
import { IconSave } from '../ui/Icon';
import { Button } from '../ui/Button';
import Modal from '../common/Modal';
import ErrorAlert from '../common/ErrorAlert';
import { SchemaForm } from '../common/forms/SchemaForm';
import { HIDE_KEYS_SINGLE, HIDE_KEYS_MULTI } from '../../utils/rulesConstants';
import {
  getRuleDefinitions,
  friendlyRuleLabel,
  findSchemaKeyByType,
  isSingleTargetKey,
} from '../../utils/rulesHelpers';
import HiddenAwareFieldTemplate from '../common/forms/HiddenAwareFieldTemplate';

import type {
  QuestionSetOutputQuestionMap,
  RubricOutputRulesItem,
  RubricInputRulesItem,
} from '../../api/models';

import { enrichSchemaByConstraints } from '../../utils/rulesConstraints';

type RuleDialogProps = {
  open: boolean;
  selectedRuleKey: string | null;
  initialRule?: RubricOutputRulesItem | RubricInputRulesItem | null;
  questionId?: string | null;
  questionType?: string | null;
  questionMap?: QuestionSetOutputQuestionMap;
  onClose: () => void;
  onSave: (rule: RubricOutputRulesItem | RubricInputRulesItem | any) => Promise<void> | void;
  isSaving?: boolean;
  error?: unknown;
};

// Resolve a concrete schema key to avoid passing union wrappers into the form
const resolveConcreteSchemaKey = (
  defs: Record<string, any>,
  selectedRuleKey: string | null,
  initialRule: any | null,
  eligibleKeys: string[]
): string | null => {
  if (selectedRuleKey && defs[selectedRuleKey]) return selectedRuleKey;
  const initType = initialRule?.type;
  if (initType) {
    const keyByType = Object.keys(defs).find((k) => defs[k]?.properties?.type?.const === initType);
    if (keyByType) return keyByType;
  }
  if (eligibleKeys.length) return eligibleKeys[0];
  const fallback = Object.keys(defs).find((k) => !!defs[k]?.properties?.type);
  return fallback ?? null;
};

// Build a concrete, valid draft from a branch schema: set type, question_id, initialise arrays/scalars
const materializeDraftFromSchema = (schema: any, questionId?: string | null, initial?: any) => {
  const props = schema?.properties ?? {};
  const out: Record<string, any> = { ...(initial ?? {}) };

  const typeConst = props?.type?.const ?? props?.type?.default;
  if (typeConst) out.type = typeConst;

  if (props?.question_id && questionId) out.question_id = questionId;

  Object.entries<any>(props).forEach(([k, p]) => {
    if (out[k] !== undefined) return;
    if (k === 'type' || k === 'question_id') return;

    if (p.type === 'array') {
      out[k] = Array.isArray(p.default) ? p.default : [];
    } else if (p.type === 'number' || p.type === 'integer') {
      if (p.default !== undefined) out[k] = p.default;
    } else if (p.type === 'string') {
      if (p.default !== undefined) out[k] = p.default;
    } else if (p.type === 'boolean') {
      if (p.default !== undefined) out[k] = p.default;
    }
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
  if (!open) return null;

  const defs = React.useMemo(() => getRuleDefinitions(), []);

  const eligibleKeys = React.useMemo(() => {
    return Object.keys(defs).filter((key) => {
      const def = defs[key];
      const props = def?.properties ?? {};
      const qTypesDefault = props?.question_types?.default;
      const compatible =
        !questionType || (Array.isArray(qTypesDefault) ? qTypesDefault.includes(questionType) : true);
      return (questionId ? isSingleTargetKey(defs, key) : !isSingleTargetKey(defs, key)) && compatible;
    });
  }, [defs, questionType, questionId]);

  const concreteKey = React.useMemo(
    () => resolveConcreteSchemaKey(defs, selectedRuleKey, initialRule ?? null, eligibleKeys),
    [defs, selectedRuleKey, initialRule, eligibleKeys]
  );

  const baseSchema = React.useMemo(() => (concreteKey ? defs[concreteKey] : null), [defs, concreteKey]);

  const [draft, setDraft] = React.useState<any>(() => {
    return baseSchema ? materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}) : (initialRule ?? {});
  });

  React.useEffect(() => {
    if (!baseSchema) return;
    setDraft(materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSchema, questionId]);

  const hiddenKeys = React.useMemo(
    () => (questionId ? [...HIDE_KEYS_SINGLE] : [...HIDE_KEYS_MULTI]),
    [questionId]
  );

  const { schemaForRender, mergedUiSchema } = React.useMemo(() => {
    const baseUi: Record<string, any> = {
      'ui:title': '',
      'ui:options': { label: true },
      'ui:submitButtonOptions': { norender: true },
    };
    hiddenKeys.forEach((k) => {
      baseUi[k] = {
        'ui:widget': 'hidden',
        'ui:title': '',
        'ui:options': { label: false },
      };
    });

    if (!baseSchema) return { schemaForRender: null as any, mergedUiSchema: baseUi };

    const enriched =
      questionMap ? enrichSchemaByConstraints(baseSchema, defs, draft, questionMap, questionId) : { schema: baseSchema, definitions: defs, uiSchema: {} };

    const schemaWithDefs = { ...enriched.schema, definitions: enriched.definitions };

    const mergedUi = { ...baseUi };
    Object.entries(enriched.uiSchema).forEach(([key, val]) => {
      const isHidden = mergedUi[key]?.['ui:options']?.hidden === true;
      if (!isHidden) mergedUi[key] = { ...(mergedUi[key] ?? {}), ...val };
    });

    return { schemaForRender: schemaWithDefs, mergedUiSchema: mergedUi };
  }, [baseSchema, defs, draft, questionMap, questionId, hiddenKeys]);

  const templates = React.useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate }), []);

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{initialRule ? 'Edit Rule' : 'Add Rule'}</h3>
        {concreteKey && <span className="text-sm opacity-70">{friendlyRuleLabel(concreteKey)}</span>}
      </div>

      {schemaForRender ? (
        <SchemaForm<any>
          key={`rule:${concreteKey ?? 'unknown'}:${questionId ?? ''}`} // force mount on branch change
          schema={schemaForRender}
          uiSchema={mergedUiSchema}
          formData={draft}
          onChange={({ formData }) => setDraft(formData)}
          onSubmit={async ({ formData }) => {
            await onSave(formData);
          }}
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
          onClick={() => {
            onSave(draft);
          }}
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