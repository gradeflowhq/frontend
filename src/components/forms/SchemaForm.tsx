import { Button } from '@mantine/core';
import { withTheme } from '@rjsf/core';
import { Theme as MantineTheme } from '@rjsf/mantine';
import validatorAjv8 from '@rjsf/validator-ajv8';
import React from 'react';

import type { FormProps } from '@rjsf/core';


const MantineForm = withTheme(MantineTheme);

export type SchemaFormProps<T = unknown> = {
  schema: FormProps<T>['schema'];
  uiSchema?: FormProps<T>['uiSchema'];
  formData?: FormProps<T>['formData'];
  onSubmit?: FormProps<T>['onSubmit'];
  onChange?: FormProps<T>['onChange'];
  onError?: FormProps<T>['onError'];
  disabled?: boolean;
  readonly?: boolean;
  liveValidate?: boolean;
  formProps?: Partial<FormProps<T>>;
  showSubmit?: boolean;
  isSubmitting?: boolean;
  submitIdleLabel?: React.ReactNode;
  submitLoadingLabel?: React.ReactNode;
  templates?: FormProps<T>['templates'];
  widgets?: FormProps<T>['widgets'];
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
  liveValidate,
  formProps,
  showSubmit = true,
  isSubmitting = false,
  submitIdleLabel = 'Submit',
  submitLoadingLabel = undefined,
  templates,
  widgets,
  formContext,
}: SchemaFormProps<T>) => {
  const mergedWidgets = React.useMemo(
    () => ({ ...MantineTheme.widgets, ...widgets }),
    [widgets],
  );
  return (
    <MantineForm
      schema={schema}
      uiSchema={uiSchema}
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
      formContext={formContext}
      {...formProps}
    >
      {showSubmit && (
        <Button
          type="submit"
          fullWidth
          mt="md"
          loading={isSubmitting}
        >
          {isSubmitting ? (submitLoadingLabel ?? submitIdleLabel) : submitIdleLabel}
        </Button>
      )}
    </MantineForm>
  );
};