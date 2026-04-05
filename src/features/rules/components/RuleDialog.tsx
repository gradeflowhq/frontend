import { Modal, Button, Alert, Group, Title, Text, Badge, Tabs, Box } from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';
import React from 'react';

import HiddenAwareFieldTemplate from '@components/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/forms/SchemaForm';
import SwitchableTextWidget from '@components/forms/widgets/SwitchableTextWidget';
import { usePreviewGrading } from '@features/grading/api';
import GradingPreviewPanel from '@features/grading/components/GradingPreviewPanel';
import GradingPreviewSettings from '@features/grading/components/GradingPreviewSettings';
import { getErrorMessage } from '@utils/error';

import { useRuleDefinitions, useCompatibleRuleKeys, useFindSchemaKeyByType } from '../api';
import { HIDE_KEYS_SINGLE, HIDE_KEYS_MULTI } from '../constants';
import { friendlyRuleLabel, augmentRulesSchemaWithQuestionIdEnums, injectEnumsFromConstraintsForQuestion, stripEngineKeysFromRulesSchema } from '../schema';


import type { RuleDefinitions } from '../api';
import type { QuestionType, RuleValue } from '../types';
import type { QuestionSetOutputQuestionMap } from '@api/models';
import type { GradingPreviewParams } from '@features/grading/components/GradingPreviewSettings';
import type { JSONSchema7 } from 'json-schema';

type RuleDialogProps = {
  open: boolean;
  selectedRuleKey: string | null;
  initialRule?: RuleValue | null;
  questionId?: string | null;
  questionType?: string | null;
  questionMap?: QuestionSetOutputQuestionMap;
  onClose: () => void;
  onSave: (rule: RuleValue) => Promise<void> | void;
  isSaving?: boolean;
  error?: unknown;
  assessmentId?: string;
};

const materializeDraftFromSchema = (
  schema: JSONSchema7 | null,
  questionId?: string | null,
  initial?: RuleValue | null
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
  const defs = useRuleDefinitions();
  const eligibleKeys = useCompatibleRuleKeys(defs, (questionType as QuestionType | undefined) ?? undefined, !!questionId);
  const findKeyByType = useFindSchemaKeyByType(defs);

  const defsWithQidEnums = React.useMemo(() => {
    if (!questionMap) return defs;
    return augmentRulesSchemaWithQuestionIdEnums(defs, questionMap as Record<string, Record<string, unknown>>);
  }, [defs, questionMap]);

  const injectedDefs = React.useMemo(() => {
    if (!questionMap || !questionId) return defsWithQidEnums;
    return injectEnumsFromConstraintsForQuestion(
      defsWithQidEnums,
      questionMap as Record<string, Record<string, unknown>>,
      questionId
    );
  }, [defsWithQidEnums, questionMap, questionId]);

  const strippedDefs = React.useMemo(() => stripEngineKeysFromRulesSchema(injectedDefs), [injectedDefs]);
  const finalDefs: RuleDefinitions = strippedDefs as RuleDefinitions;

  const concreteKey = React.useMemo(() => {
    if (selectedRuleKey && finalDefs[selectedRuleKey]) return selectedRuleKey;
    const initType = initialRule?.type;
    if (initType) {
      const k = findKeyByType(String(initType), !!questionId);
      if (k) return k;
    }
    return eligibleKeys[0] ?? null;
  }, [finalDefs, selectedRuleKey, initialRule, eligibleKeys, findKeyByType, questionId]);

  const baseSchema = React.useMemo(() => (concreteKey ? finalDefs[concreteKey] : null), [finalDefs, concreteKey]);

  const [draft, setDraft] = React.useState<RuleValue>(() =>
    baseSchema ? materializeDraftFromSchema(baseSchema, questionId, initialRule ?? undefined) : (initialRule ?? ({} as RuleValue))
  );
  React.useEffect(() => {
    if (!baseSchema) return;
    setDraft(materializeDraftFromSchema(baseSchema, questionId, initialRule ?? undefined));
  }, [baseSchema, questionId, initialRule]);

  const hiddenKeys = React.useMemo(() => (questionId ? [...HIDE_KEYS_SINGLE] : [...HIDE_KEYS_MULTI]), [questionId]);

  const computed = React.useMemo(() => {
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
  }, [baseSchema, finalDefs, hiddenKeys]);

  const templates = React.useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate }), []);
  const widgets = React.useMemo(() => ({ TextWidget: SwitchableTextWidget }), []);

  const [activeTab, setActiveTab] = React.useState<string>('config');

  const [previewParams, setPreviewParams] = React.useState<GradingPreviewParams>({
    limit: 5,
    selection: 'first',
    seed: null,
  });

  const previewMutation = usePreviewGrading(assessmentId ?? '');
  const canPreview = !!assessmentId && !!computed.schemaForRender;

  const runPreview = async () => {
    if (!canPreview) return;
    await previewMutation.mutateAsync({
      rule: draft ?? null,
      config: {
        limit: previewParams.limit,
        selection: previewParams.selection,
        seed: previewParams.seed ?? null,
      },
    });
  };

  React.useEffect(() => {
    if (open) {
      previewMutation.reset();
      setPreviewParams({ limit: 5, selection: 'first', seed: null });
      setActiveTab('config');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { schemaForRender, mergedUiSchema } = computed;

  return (
    <Modal
      opened={open}
      onClose={onClose}
      size="5xl"
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 'min(80vh, 720px)' } }}
      title={
        <Group gap="xs">
          {questionId && <Badge variant="light" color="gray">{questionId}</Badge>}
          <Title order={4}>{initialRule ? 'Edit Rule' : 'Add Rule'}</Title>
          {concreteKey && <Text size="sm" c="dimmed">{friendlyRuleLabel(concreteKey)}</Text>}
        </Group>
      }
    >
      <Tabs
        value={activeTab}
        onChange={(v) => v && setActiveTab(v)}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Tabs.List px="md" pt="xs">
          <Tabs.Tab value="config">Configure</Tabs.Tab>
          {canPreview && <Tabs.Tab value="preview">Preview</Tabs.Tab>}
        </Tabs.List>

        <Box style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <Tabs.Panel value="config">
            {schemaForRender ? (
              <SchemaForm<RuleValue>
                key={`rule:${concreteKey ?? 'unknown'}:${questionId ?? ''}`}
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
              <Alert color="yellow" mt="sm">Rule schema not found.</Alert>
            )}
            {!!error && (
              <Alert color="red" mt="sm">{getErrorMessage(error)}</Alert>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="preview">
            <GradingPreviewSettings
              value={previewParams}
              onChange={setPreviewParams}
              onRun={() => void runPreview()}
              runLoading={previewMutation.isPending}
            />
            {(previewMutation.isPending || previewMutation.isError || (previewMutation.data?.submissions?.length ?? 0) > 0) && (
              <Box mt="md">
                <GradingPreviewPanel
                  items={previewMutation.data?.submissions ?? []}
                  loading={previewMutation.isPending}
                  error={previewMutation.isError ? previewMutation.error : undefined}
                  maxHeightVh={40}
                />
              </Box>
            )}
          </Tabs.Panel>
        </Box>
      </Tabs>

      <Box style={{ borderTop: '1px solid var(--mantine-color-default-border)', padding: '12px 16px', flexShrink: 0 }}>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={!!isSaving}>
            Cancel
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={() => void onSave(draft as RuleValue)}
            disabled={!schemaForRender}
            loading={!!isSaving}
          >
            Save
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default RuleDialog;
