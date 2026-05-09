import { Button } from '@mantine/core';
import { withTheme } from '@rjsf/core';
import { Theme as MantineTheme } from '@rjsf/mantine';
import { SUBMIT_BTN_OPTIONS_KEY } from '@rjsf/utils';
import validatorAjv8 from '@rjsf/validator-ajv8';
import React from 'react';

import type { FormProps } from '@rjsf/core';


const MantineForm = withTheme(MantineTheme);
const DEFAULT_LIVE_VALIDATE = 'onBlur';

export type SchemaFormProps<T = unknown> = {
  schema: FormProps<T>['schema'];
  uiSchema?: FormProps<T>['uiSchema'];
  formData?: FormProps<T>['formData'];
  onSubmit?: FormProps<T>['onSubmit'];
  onChange?: FormProps<T>['onChange'];
  onError?: FormProps<T>['onError'];
  disabled?: boolean;
  readonly?: boolean;
  liveValidate?: FormProps<T>['liveValidate'];
  formProps?: Partial<FormProps<T>>;
  showSubmit?: boolean;
  isSubmitting?: boolean;
  submitIdleLabel?: React.ReactNode;
  submitLoadingLabel?: React.ReactNode;
  templates?: FormProps<T>['templates'];
  widgets?: FormProps<T>['widgets'];
  fields?: FormProps<T>['fields'];
  formContext?: FormProps<T>['formContext'];
};

export const SchemaForm = <T = unknown>({
  schema,
  uiSchema,
  formData,
  onSubmit,
  onChange,
  onError,
  disabled,
  readonly,
  liveValidate = DEFAULT_LIVE_VALIDATE,
  formProps,
  showSubmit = true,
  isSubmitting = false,
  submitIdleLabel = 'Submit',
  submitLoadingLabel = undefined,
  templates,
  widgets,
  fields,
  formContext,
}: SchemaFormProps<T>) => {
  const mergedWidgets = React.useMemo(
    () => ({ ...MantineTheme.widgets, ...widgets }),
    [widgets],
  );
  const effectiveUiSchema = React.useMemo(() => {
    if (showSubmit) return uiSchema;
    return {
      ...uiSchema,
      'ui:options': {
        ...(uiSchema?.['ui:options'] as Record<string, unknown> | undefined),
        [SUBMIT_BTN_OPTIONS_KEY]: { norender: true },
      },
    };
  }, [showSubmit, uiSchema]);

  return (
    <MantineForm
      schema={schema}
      uiSchema={effectiveUiSchema}
      formData={formData}
      validator={validatorAjv8}
      onSubmit={onSubmit}
      onChange={onChange}
      onError={onError}
      disabled={disabled}
      readonly={readonly}
      liveValidate={liveValidate}
      templates={templates}
      widgets={mergedWidgets}
      fields={fields}
      formContext={formContext}
      {...formProps}
    >
      {showSubmit ? (
        <Button
          type="submit"
          fullWidth
          mt="md"
          loading={isSubmitting}
        >
          {isSubmitting ? (submitLoadingLabel ?? submitIdleLabel) : submitIdleLabel}
        </Button>
      ) : (
        <React.Fragment />
      )}
    </MantineForm>
  );
};
