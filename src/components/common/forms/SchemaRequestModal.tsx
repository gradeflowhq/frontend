import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';

import ErrorAlert from '@components/common/ErrorAlert';
import Modal from '@components/common/Modal';
import { useToast } from '@components/common/ToastProvider';

import HiddenAwareFieldTemplate from './HiddenAwareFieldTemplate';
import { SchemaForm, type SchemaFormProps } from './SchemaForm';

export type SchemaRequestModalProps<TForm, TData = unknown> = {
  open: boolean;
  title: string;
  schema: Record<string, unknown> | null;
  onClose: () => void;
  mutationKey: UseMutationOptions<TData, unknown, TForm>['mutationKey'];
  mutationFn: (payload: TForm) => Promise<TData>;
  onSuccess?: (data?: TData) => Promise<void> | void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
  initialValues?: () => TForm | undefined;
  buildUiSchema?: (formData: TForm | undefined) => SchemaFormProps<TForm>['uiSchema'];
  templates?: SchemaFormProps<TForm>['templates'];
  widgets?: SchemaFormProps<TForm>['widgets'];
  submitIdleLabel?: React.ReactNode;
  submitLoadingLabel?: React.ReactNode;
  validate?: (formData: TForm | undefined) => void;
};

const SchemaRequestModalInner = <TForm, TData = unknown>({
  title,
  schema,
  onClose,
  mutationKey,
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
  initialValues,
  buildUiSchema,
  templates,
  widgets,
  submitIdleLabel = 'Submit',
  submitLoadingLabel,
  validate,
}: Omit<SchemaRequestModalProps<TForm, TData>, 'open'>) => {
  const toast = useToast();

  const [formData, setFormData] = useState<TForm | undefined>(() => initialValues?.());

  const uiSchema = useMemo(() => buildUiSchema?.(formData), [buildUiSchema, formData]);

  const mergedTemplates = useMemo(() => ({ FieldTemplate: HiddenAwareFieldTemplate, ...(templates || {}) }), [templates]);

  const mutation = useMutation<TData, unknown, TForm>({
    mutationKey,
    mutationFn: async (payload: TForm) => {
      if (!mutationFn) throw new Error('mutationFn is required');
      return await mutationFn(payload);
    },
    onSuccess: async (data) => {
      if (successMessage) toast.success(successMessage);
      await onSuccess?.(data);
      onClose();
    },
    onError: (err) => {
      if (errorMessage) toast.error(errorMessage);
      onError?.(err);
    },
  });

  return (
    <Modal open onClose={onClose}>
      <h3 className="font-bold text-lg">{title}</h3>
      {!schema ? (
        <div className="alert alert-warning mt-2">
          <span>Schema not available.</span>
        </div>
      ) : (
        <SchemaForm<TForm>
          schema={schema}
          uiSchema={uiSchema}
          templates={mergedTemplates}
          widgets={widgets}
          formData={formData}
          onChange={({ formData }) => setFormData(formData)}
          isSubmitting={mutation.isPending}
          submitIdleLabel={submitIdleLabel}
          submitLoadingLabel={submitLoadingLabel}
          onSubmit={({ formData }) => {
            validate?.(formData as TForm | undefined);
            if (!formData) throw new Error('Form data is required');
            void mutation.mutateAsync(formData as TForm);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}

      {mutation.isError && <ErrorAlert error={mutation.error} className="mt-3" />}
    </Modal>
  );
};

const SchemaRequestModal = <TForm,>(props: SchemaRequestModalProps<TForm>) => {
  if (!props.open) return null;
  return <SchemaRequestModalInner {...props} />;
};

export default SchemaRequestModal;
