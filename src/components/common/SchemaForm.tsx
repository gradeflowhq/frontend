import React from 'react';
import { withTheme } from '@rjsf/core';
import type { FormProps } from '@rjsf/core';
import { Theme as DaisyUITheme } from '@rjsf/daisyui';
import validatorAjv8 from '@rjsf/validator-ajv8';

const DaisyUIForm = withTheme(DaisyUITheme);

export type SchemaFormProps<T = any> = {
  schema: Record<string, any>;
  uiSchema?: Record<string, any>;
  formData?: T;
  onSubmit: (data: { formData: T }) => void;
  onChange?: (data: { formData: T }) => void;
  onError?: (errors: any) => void;
  disabled?: boolean;
  readonly?: boolean;
  liveValidate?: boolean;
  formProps?: Partial<FormProps<T>>;
  showSubmit?: boolean;
  templates?: FormProps<T>['templates'];     // NEW: override templates (FieldTemplate)
  formContext?: FormProps<T>['formContext']; // NEW: pass global context (hide keys)
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
          <button type="submit" className="btn btn-primary w-full">
            Submit
          </button>
        </div>
      )}
    </DaisyUIForm>
  );
};