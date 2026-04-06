import { Alert, Box, Button, Group } from '@mantine/core';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import React from 'react';

import HiddenAwareFieldTemplate from '@components/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/forms/SchemaForm';
import SwitchableTextWidget from '@components/forms/widgets/SwitchableTextWidget';
import { getErrorMessage } from '@utils/error';

import { useRuleDefinitions, useCompatibleRuleKeys, useFindSchemaKeyByType } from '../api';
import { HIDE_KEYS_SINGLE } from '../constants';
import {
  augmentRulesSchemaWithQuestionIdEnums,
  injectEnumsFromConstraintsForQuestion,
  stripEngineKeysFromRulesSchema,
} from '../schema';

import type { RuleDefinitions } from '../api';
import type { QuestionType, RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { JSONSchema7 } from 'json-schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

const materializeDraftFromSchema = (
  schema: JSONSchema7 | null,
  questionId?: string | null,
  initial?: RuleValue | null,
): RuleValue => {
  const props = (schema?.properties as Record<string, JSONSchema7> | undefined) ?? {};
  const draft: Record<string, unknown> = { ...(initial ?? {}) };
  const typeConst = props?.type?.const ?? props?.type?.default;
  if (typeConst !== undefined && draft.type === undefined) draft.type = typeConst;
  if (props?.question_id && questionId && draft.question_id === undefined) {
    draft.question_id = questionId;
  }
  return draft as unknown as RuleValue;
};

// ── Component ─────────────────────────────────────────────────────────────────

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
  /** Called whenever the internal draft changes, so the parent can use it for live preview. */
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
  const defs = useRuleDefinitions();
  const eligibleKeys = useCompatibleRuleKeys(defs, questionType as QuestionType, true);
  const findKeyByType = useFindSchemaKeyByType(defs);

  const defsWithQidEnums = React.useMemo(() => {
    if (!questionMap) return defs;
    return augmentRulesSchemaWithQuestionIdEnums(
      defs,
      questionMap as Record<string, Record<string, unknown>>,
    );
  }, [defs, questionMap]);

  const injectedDefs = React.useMemo(() => {
    if (!questionMap || !questionId) return defsWithQidEnums;
    return injectEnumsFromConstraintsForQuestion(
      defsWithQidEnums,
      questionMap as Record<string, Record<string, unknown>>,
      questionId,
    );
  }, [defsWithQidEnums, questionMap, questionId]);

  const strippedDefs = React.useMemo(
    () => stripEngineKeysFromRulesSchema(injectedDefs),
    [injectedDefs],
  );
  const finalDefs: RuleDefinitions = strippedDefs as RuleDefinitions;

  const concreteKey = React.useMemo(() => {
    if (selectedRuleKey && finalDefs[selectedRuleKey]) return selectedRuleKey;
    const initType = initialRule?.type;
    if (initType) {
      const k = findKeyByType(String(initType), true);
      if (k) return k;
    }
    return eligibleKeys[0] ?? null;
  }, [finalDefs, selectedRuleKey, initialRule, eligibleKeys, findKeyByType]);

  const baseSchema = React.useMemo(
    () => (concreteKey ? finalDefs[concreteKey] : null),
    [finalDefs, concreteKey],
  );

  const [draft, setDraft] = React.useState<RuleValue>(() =>
    baseSchema
      ? materializeDraftFromSchema(baseSchema, questionId, initialRule ?? undefined)
      : (initialRule ?? ({} as RuleValue)),
  );

  React.useEffect(() => {
    if (!baseSchema) return;
    setDraft(materializeDraftFromSchema(baseSchema, questionId, initialRule ?? undefined));
  }, [baseSchema, questionId, initialRule]);

  // Keep parent in sync with draft for live preview
  React.useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const hiddenKeys = [...HIDE_KEYS_SINGLE];

  const { schemaForRender, mergedUiSchema } = React.useMemo(() => {
    const baseUi: Record<string, unknown> = {
      'ui:title': '',
      'ui:options': { label: true },
      'ui:submitButtonOptions': { norender: true },
    };
    hiddenKeys.forEach((k) => {
      baseUi[k] = { 'ui:widget': 'hidden', 'ui:title': '', 'ui:options': { label: false } };
    });
    if (!baseSchema) return { schemaForRender: null as JSONSchema7 | null, mergedUiSchema: baseUi };
    const schemaWithDefs = { ...baseSchema, definitions: finalDefs };
    return { schemaForRender: schemaWithDefs, mergedUiSchema: baseUi };
  }, [baseSchema, finalDefs]);  // eslint-disable-line react-hooks/exhaustive-deps

  const templates = React.useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate }), []);
  const widgets = React.useMemo(() => ({ TextWidget: SwitchableTextWidget }), []);

  return (
    <Box>
      {schemaForRender ? (
        <SchemaForm<RuleValue>
          key={`rule:${concreteKey ?? 'unknown'}:${questionId}`}
          schema={schemaForRender}
          uiSchema={mergedUiSchema}
          formData={draft}
          onChange={({ formData }) => setDraft((formData ?? draft) as RuleValue)}
          onSubmit={({ formData }) => {
            if (formData) void onSave(formData as RuleValue);
          }}
          formProps={{ noHtml5Validate: true }}
          showSubmit={false}
          templates={templates}
          widgets={widgets}
          formContext={{ hideKeys: new Set(hiddenKeys) }}
        />
      ) : (
        <Alert color="yellow">Rule schema not found.</Alert>
      )}

      {!!error && (
        <Alert color="red" mt="sm">
          {getErrorMessage(error)}
        </Alert>
      )}

      <Group justify="flex-end" gap="sm" mt="md">
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconX size={14} />}
          onClick={onCancel}
          disabled={!!isSaving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          leftSection={<IconDeviceFloppy size={14} />}
          onClick={() => void onSave(draft)}
          disabled={!schemaForRender}
          loading={!!isSaving}
        >
          Save
        </Button>
      </Group>
    </Box>
  );
};

export default InlineRuleEditor;
