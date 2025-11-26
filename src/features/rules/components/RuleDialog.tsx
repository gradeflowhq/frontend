import React from 'react';
import { IconSave, IconSettings } from '@components/ui/Icon';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import { SchemaForm } from '@components/common/forms/SchemaForm';
import HiddenAwareFieldTemplate from '@components/common/forms/HiddenAwareFieldTemplate';
import { DropdownMenu } from '@components/ui/DropdownMenu';
import SwitchableTextWidget from '@components/common/forms/widgets/SwitchableTextWidget';

import { HIDE_KEYS_SINGLE, HIDE_KEYS_MULTI } from '../constants';
import { useRuleDefinitions, useCompatibleRuleKeys, useFindSchemaKeyByType } from '../hooks';
import { friendlyRuleLabel } from '../helpers';
import { augmentRulesSchemaWithQuestionIdEnums } from '../helpers/augmentations';
import { injectEnumsFromConstraintsForQuestion } from '../helpers/constraints';

import { usePreviewGrading } from '@features/grading/hooks';
import GradingPreviewPanel from '@features/grading/components/GradingPreviewPanel';
import GradingPreviewSettings from '@features/grading/components/GradingPreviewSettings';
import type { GradingPreviewParams } from '@features/grading/components/GradingPreviewSettings';

import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { RuleValue } from '../types';
import { stripEngineKeysFromRulesSchema } from '../helpers/engine';

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
  assessmentId?: string;
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
  assessmentId,
}) => {
  // Base rule definitions
  const defs = useRuleDefinitions();
  const eligibleKeys = useCompatibleRuleKeys(defs, questionType as any, !!questionId);
  const findKeyByType = useFindSchemaKeyByType(defs);

  // Augment schemas
  const defsWithQidEnums = React.useMemo(() => {
    if (!questionMap) return defs;
    return augmentRulesSchemaWithQuestionIdEnums(defs as any, questionMap as any) as Record<string, any>;
  }, [defs, questionMap]);

  const injectedDefs = React.useMemo(() => {
    if (!questionMap || !questionId) return defsWithQidEnums;
    return injectEnumsFromConstraintsForQuestion(defsWithQidEnums as any, questionMap as any, questionId) as Record<
      string,
      any
    >;
  }, [defsWithQidEnums, questionMap, questionId]);

  const strippedDefs = React.useMemo(() => {
    return stripEngineKeysFromRulesSchema(injectedDefs);
  }, [injectedDefs]);

  const finalDefs = strippedDefs;

  // Resolve concrete schema key
  const concreteKey = React.useMemo(() => {
    if (selectedRuleKey && finalDefs[selectedRuleKey]) return selectedRuleKey;
    const initType = (initialRule as any)?.type;
    if (initType) {
      const k = findKeyByType(String(initType), !!questionId);
      if (k) return k;
    }
    return eligibleKeys[0] ?? null;
  }, [finalDefs, selectedRuleKey, initialRule, eligibleKeys, findKeyByType, questionId]);

  // Base schema
  const baseSchema = React.useMemo(() => (concreteKey ? finalDefs[concreteKey] : null), [finalDefs, concreteKey]);

  // Draft form state
  const [draft, setDraft] = React.useState<any>(() => {
    return baseSchema ? materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}) : (initialRule ?? {});
  });
  React.useEffect(() => {
    if (!baseSchema) return;
    setDraft(materializeDraftFromSchema(baseSchema, questionId, initialRule ?? {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseSchema, questionId]);

  // Hide boilerplate fields in UI
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
    const schemaWithDefs = { ...baseSchema, definitions: finalDefs };
    return { schemaForRender: schemaWithDefs, mergedUiSchema: baseUi };
  }, [baseSchema, finalDefs, hiddenKeys]);

  const templates = React.useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate }), []);
  const widgets = React.useMemo(() => ({ TextWidget: SwitchableTextWidget }), []);

  // Preview params
  const [previewParams, setPreviewParams] = React.useState<GradingPreviewParams>({
    limit: 5,
    selection: 'first',
    seed: null,
  });

  // Preview mutation
  const previewMutation = usePreviewGrading(assessmentId ?? '');
  const canPreview = !!assessmentId && !!computed.schemaForRender;

  const runPreview = async () => {
    if (!canPreview) return;
    await previewMutation.mutateAsync({
      use_stored_question_set: true,
      use_stored_rubric: false,
      use_stored_submissions: true,
      question_set: null,
      rubric: null,
      raw_submissions: null,
      rule: draft as any,
      limit: previewParams.limit,
      selection: previewParams.selection,
      seed: previewParams.seed ?? null,
    });
  };

  // Clear errors/preview/etc when opening dialog
  React.useEffect(() => {
    if (open) {
      previewMutation.reset(); // clears data/error/isPending state
      setPreviewParams({ limit: 5, selection: 'first', seed: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const { schemaForRender, mergedUiSchema } = computed;

  // Decide whether to show the preview column
  const hasPreview =
    previewMutation.isPending ||
    previewMutation.isError ||
    ((previewMutation.data?.graded_submissions?.length ?? 0) > 0);

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-6xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">
          {questionId && <span className="badge badge-ghost mr-2 mb-1">{questionId}</span>}
          {initialRule ? 'Edit Rule' : 'Add Rule'}
        </h3>
        {concreteKey && <span className="text-sm opacity-70">{friendlyRuleLabel(concreteKey)}</span>}
      </div>

      {/* One or two-column layout depending on preview visibility */}
      <div className={`grid grid-cols-1 ${hasPreview ? 'md:grid-cols-2' : ''} gap-4`}>
        {/* Left: Rule form */}
        <div>
          {schemaForRender ? (
            <SchemaForm<any>
              key={`rule:${concreteKey ?? 'unknown'}:${questionId ?? ''}`}
              schema={schemaForRender}
              uiSchema={mergedUiSchema}
              formData={draft}
              onChange={({ formData }) => setDraft(formData)}
              onSubmit={async ({ formData }) => {
                await onSave(formData as RuleValue);
              }}
              formProps={{ noHtml5Validate: true }}
              showSubmit={false}
              templates={templates}
              widgets={widgets}
              formContext={{ hideKeys: new Set(hiddenKeys) }}
            />
          ) : (
            <div className="alert alert-warning mt-2">
              <span>Rule schema not found.</span>
            </div>
          )}

          {/* Service errors (shown in both add/edit) */}
          {error && <ErrorAlert error={error} className="mt-2" />}
        </div>

        {/* Right: Preview panel (only when preview/loading/error) */}
        {hasPreview && (
          <div>
            <GradingPreviewPanel
              items={previewMutation.data?.graded_submissions ?? []}
              loading={previewMutation.isPending}
              error={previewMutation.isError ? previewMutation.error : undefined}
              maxHeightVh={60}
            />
          </div>
        )}
      </div>

      {/* Bottom-right global action bar */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={!!isSaving}>
          Cancel
        </Button>

        <div className="join">
          <LoadingButton
            type="button"
            variant="outline"
            className="join-item"
            onClick={runPreview}
            isLoading={previewMutation.isPending}
            disabled={!canPreview}
            title={!assessmentId ? 'Assessment missing' : 'Run preview'}
          >
            Preview
          </LoadingButton>

          <DropdownMenu
            align="end"
            position="top"
            className="join-item btn btn-outline m-0 p-0"
            trigger={<IconSettings />}
            isItemList={false}
          >
            <GradingPreviewSettings value={previewParams} onChange={setPreviewParams} className="dropdown-content w-100" />
          </DropdownMenu>
        </div>

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