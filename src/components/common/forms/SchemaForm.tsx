import React from 'react';
import LoadingButton from '../../ui/LoadingButton';
import { withTheme } from '@rjsf/core';
import type { FormProps } from '@rjsf/core';
import { Theme as DaisyUITheme } from '@rjsf/daisyui';
import validatorAjv8 from '@rjsf/validator-ajv8';

const DaisyUIForm = withTheme(DaisyUITheme);

export type SchemaFormProps<T = any> = {
  schema: Record<string, any>;
  uiSchema?: Record<string, any>;
  formData?: T;
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
  formContext?: FormProps<T>['formContext'];
};

export const SchemaForm = <T extends any>({
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
  formContext,
}: SchemaFormProps<T>) => {
  return (
    <DaisyUIForm
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
      formContext={formContext}
      {...formProps}
    >
      {showSubmit && (
        <div className="mt-4">
          <LoadingButton
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
            idleLabel={submitIdleLabel}
            loadingLabel={submitLoadingLabel}
          >
            {submitIdleLabel}
          </LoadingButton>
        </div>
      )}
    </DaisyUIForm>
  );
};