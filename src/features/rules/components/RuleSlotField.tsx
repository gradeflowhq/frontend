import { Select, Stack } from '@mantine/core';
import React from 'react';

import ErrorAlert from '@components/common/ErrorAlert';
import { FormFieldsSkeleton } from '@components/common/Skeletons';
import HiddenAwareFieldTemplate from '@components/forms/HiddenAwareFieldTemplate';
import { SchemaForm } from '@components/forms/SchemaForm';
import CodeEditorWidget from '@components/forms/widgets/CodeEditorWidget';
import { getErrorMessage } from '@utils/error';

import StringListField from './StringListField';
import { useCompatibleRules, useRuleSchema } from '../api';
import { isRecord, mergeContextInitialValue, valueKey } from '../contextInitialValue';
import { buildRuleUiSchema } from '../schemaUi';

import type { RuleValue } from '../types';
import type { FieldProps } from '@rjsf/utils';
import type { JSONSchema7 } from 'json-schema';

type RuleFormContext = {
  assessmentId?: string;
  questionId?: string | null;
};

const templates = { FieldTemplate: HiddenAwareFieldTemplate };
const widgets = { CodeEditorWidget };
const formProps = {
  tagName: 'div' as const,
  noHtml5Validate: true,
  noValidate: true,
};

const fieldPath = (props: FieldProps): string => props.fieldPathId.path.map(String).join('.');

const ruleType = (value: unknown): string | null => {
  const type = isRecord(value) ? value.type : null;
  return typeof type === 'string' ? type : null;
};

const ruleQuestionId = (value: unknown): string | null => {
  const questionId = isRecord(value) ? value.question_id : null;
  return typeof questionId === 'string' && questionId.length > 0 ? questionId : null;
};

const RuleSlotField: React.FC<FieldProps<RuleValue>> = (props) => {
  const formContext = props.registry.formContext as RuleFormContext;
  const assessmentId = formContext.assessmentId ?? '';
  const fieldPathList = props.fieldPathId.path;
  const onRuleChange = props.onChange;
  const path = fieldPath(props);
  const currentType = ruleType(props.formData);
  const [selectedType, setSelectedType] = React.useState<string | null>(currentType);
  const currentValueKey = React.useMemo(() => valueKey(props.formData), [props.formData]);
  const pendingValueKeyRef = React.useRef<string | null>(null);
  const previousInitialRef = React.useRef<RuleValue | null>(null);

  React.useEffect(() => {
    if (pendingValueKeyRef.current === currentValueKey) {
      pendingValueKeyRef.current = null;
    }
  }, [currentValueKey]);

  const notifyChange = React.useCallback(
    (next: RuleValue | undefined) => {
      const nextValueKey = valueKey(next);
      if (nextValueKey === currentValueKey || nextValueKey === pendingValueKeyRef.current) {
        return;
      }
      pendingValueKeyRef.current = nextValueKey;
      onRuleChange(next, fieldPathList);
    },
    [currentValueKey, fieldPathList, onRuleChange],
  );

  React.useEffect(() => {
    setSelectedType(currentType);
  }, [currentType]);

  const questionId = ruleQuestionId(props.formData) ?? formContext.questionId ?? null;
  const contextParams = React.useMemo(
    () => ({
      ...(questionId ? { question_id: questionId } : {}),
      ...(path ? { path } : {}),
    }),
    [path, questionId],
  );

  const compatibleRules = useCompatibleRules(assessmentId, contextParams, Boolean(assessmentId));
  const schema = useRuleSchema(
    assessmentId,
    selectedType ? { ...contextParams, type: selectedType } : null,
    Boolean(assessmentId && selectedType),
  );
  const ruleSchema = schema.data?.schema as JSONSchema7 | undefined;
  const uiSchema = React.useMemo(
    () => (ruleSchema ? buildRuleUiSchema(ruleSchema) : {}),
    [ruleSchema],
  );

  React.useEffect(() => {
    if (!selectedType || !schema.data) return;

    const initialValue = schema.data.initial_value as RuleValue;
    const previousInitial = previousInitialRef.current;
    previousInitialRef.current = initialValue;

    if (ruleType(props.formData) !== selectedType) {
      notifyChange(initialValue);
      return;
    }

    if (!props.formData) {
      notifyChange(initialValue);
      return;
    }

    const nextValue = mergeContextInitialValue(props.formData, previousInitial, initialValue);
    if (nextValue) notifyChange(nextValue);
  }, [notifyChange, props.formData, schema.data, selectedType]);

  const formData = React.useMemo(() => {
    if (ruleType(props.formData) === selectedType) return props.formData;
    return schema.data?.initial_value as RuleValue | undefined;
  }, [props.formData, schema.data?.initial_value, selectedType]);

  const nestedQuestionId = ruleQuestionId(formData) ?? questionId;
  const nestedContext = React.useMemo(
    () => ({ ...formContext, questionId: nestedQuestionId }),
    [formContext, nestedQuestionId],
  );

  return (
    <Stack gap="xs">
      <Select
        label={props.name}
        placeholder="Select rule"
        data={(compatibleRules.data ?? []).map((rule) => ({
          value: rule.type,
          label: rule.label,
        }))}
        value={selectedType}
        onChange={(nextType) => {
          setSelectedType(nextType);
          if (!nextType) notifyChange(undefined);
        }}
        searchable
        clearable
        disabled={props.disabled || props.readonly}
        error={compatibleRules.isError ? getErrorMessage(compatibleRules.error) : undefined}
      />

      {schema.isError && <ErrorAlert error={schema.error} />}

      {selectedType && schema.isLoading && (
        <FormFieldsSkeleton fields={2} withActions={false} ariaLabel="Loading nested rule form" />
      )}

      {ruleSchema && formData && (
        <SchemaForm<RuleValue>
          schema={ruleSchema}
          uiSchema={uiSchema}
          formData={formData}
          onChange={({ formData: next }) => notifyChange(next)}
          formProps={formProps}
          showSubmit={false}
          templates={templates}
          widgets={widgets}
          fields={ruleFields}
          formContext={nestedContext}
        />
      )}
    </Stack>
  );
};

const ruleFields = { RuleSlotField, StringListField };

export default RuleSlotField;
