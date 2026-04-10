import React from 'react';

import {
  useCompatibleRuleKeys,
  useFindSchemaKeyByType,
  useRuleDefinitions,
} from '../api';
import { HIDE_KEYS_MULTI, HIDE_KEYS_SINGLE } from '../constants';
import {
  prepareRuleDefinitionsForRender,
} from '../schema';

import type { RuleDefinitions } from '../api';
import type { QuestionType, RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds an initial draft from a schema definition.
 * Exported so callers that construct bare drafts (e.g. handleAdd) can reuse it.
 */
export const materializeDraft = (
  schema: JSONSchema7 | null,
  questionId?: string | null,
  initial?: RuleValue | null,
): RuleValue => {
  const props =
    (schema?.properties as Record<string, JSONSchema7> | undefined) ?? {};
  const draft: Record<string, unknown> = { ...(initial ?? {}) };
  const typeConst = props?.type?.const ?? props?.type?.default;
  if (typeConst !== undefined && draft.type === undefined) draft.type = typeConst;
  if (props?.question_id && questionId && draft.question_id === undefined) {
    draft.question_id = questionId;
  }
  return draft as unknown as RuleValue;
};

// ── types ─────────────────────────────────────────────────────────────────────

export interface UseRuleEditorStateOptions {
  /** Pre-selected schema key (e.g. "AllOrNothingMultiQuestionRule"). */
  selectedRuleKey: string | null;
  /** Existing rule being edited; null/undefined when adding. */
  initialRule?: RuleValue | null;
  /**
   * Non-empty string for single-target rules.
   * Null, undefined, or empty string for multi-target rules.
   */
  questionId?: string | null;
  /** Used to filter compatible rule keys. */
  questionType?: string | null;
  /** Full question map — used to inject enums into the schema. */
  questionMap?: QuestionSetOutputQuestionMap;
}

export interface UseRuleEditorStateResult {
  draft: RuleValue;
  setDraft: React.Dispatch<React.SetStateAction<RuleValue>>;
  schemaForRender: JSONSchema7 | null;
  mergedUiSchema: Record<string, unknown>;
  concreteKey: string | null;
  hiddenKeys: readonly string[];
}

// ── hook ──────────────────────────────────────────────────────────────────────

/**
 * Encapsulates all schema-augmentation and draft-materialisation logic shared
 * between single-target (InlineRuleEditor) and multi-target (GlobalRuleDetailPanel)
 * rule editors.
 */
export const useRuleEditorState = ({
  selectedRuleKey,
  initialRule,
  questionId,
  questionType,
  questionMap,
}: UseRuleEditorStateOptions): UseRuleEditorStateResult => {
  const defs = useRuleDefinitions();

  // Treat empty string the same as null — never a valid questionId.
  const isSingleTarget = typeof questionId === 'string' && questionId.length > 0;

  const eligibleKeys = useCompatibleRuleKeys(
    defs,
    (questionType as QuestionType | undefined) ?? undefined,
    isSingleTarget,
  );
  const findKeyByType = useFindSchemaKeyByType(defs);

  const finalDefs = React.useMemo(() => {
    return prepareRuleDefinitionsForRender(defs as Record<string, unknown>, {
      questionMap: questionMap as Record<string, Record<string, unknown>> | undefined,
      questionId,
      questionType,
      isSingleTarget,
    }) as RuleDefinitions;
  }, [defs, isSingleTarget, questionId, questionMap, questionType]);

  // 4. Resolve the concrete schema key to use
  const concreteKey = React.useMemo(() => {
    if (selectedRuleKey && finalDefs[selectedRuleKey]) return selectedRuleKey;
    const initType = initialRule?.type;
    if (initType) {
      const k = findKeyByType(String(initType), isSingleTarget);
      if (k) return k;
    }
    return eligibleKeys[0] ?? null;
  }, [finalDefs, selectedRuleKey, initialRule, eligibleKeys, findKeyByType, isSingleTarget]);

  const baseSchema = React.useMemo(
    () => (concreteKey ? finalDefs[concreteKey] : null),
    [finalDefs, concreteKey],
  );

  // 5. Draft state — re-initialises when the base schema or question changes
  const [draft, setDraft] = React.useState<RuleValue>(() =>
    materializeDraft(baseSchema, questionId, initialRule ?? undefined),
  );

  React.useEffect(() => {
    setDraft(materializeDraft(baseSchema, questionId, initialRule ?? undefined));
  }, [baseSchema, questionId, initialRule]);

  // 6. Hidden keys depend on whether this is a single- or multi-target editor
  const hiddenKeys = isSingleTarget
    ? (HIDE_KEYS_SINGLE as readonly string[])
    : (HIDE_KEYS_MULTI as readonly string[]);

  // 7. Schema + uiSchema for <SchemaForm>
  const { schemaForRender, mergedUiSchema } = React.useMemo(() => {
    const baseUi: Record<string, unknown> = {
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
    if (!baseSchema) {
      return { schemaForRender: null as JSONSchema7 | null, mergedUiSchema: baseUi };
    }
    return {
      schemaForRender: { ...baseSchema, definitions: finalDefs } as JSONSchema7,
      mergedUiSchema: baseUi,
    };
  }, [baseSchema, finalDefs, hiddenKeys]);

  return { draft, setDraft, schemaForRender, mergedUiSchema, concreteKey, hiddenKeys };
};