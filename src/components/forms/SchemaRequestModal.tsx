import { Modal, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';

import { getErrorMessage } from '@utils/error';

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
  open,
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
}: SchemaRequestModalProps<TForm, TData>) => {
  React.useEffect(() => {
    if (open) {
      setFormData(initialValues?.());
      setValidationError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [formData, setFormData] = useState<TForm | undefined>(() => initialValues?.());
  const [validationError, setValidationError] = useState<unknown>(null);

  const uiSchema = useMemo(() => buildUiSchema?.(formData), [buildUiSchema, formData]);

  const mergedTemplates = useMemo(
    () => ({ FieldTemplate: HiddenAwareFieldTemplate, ...(templates || {}) }),
    [templates]
  );

  const mutation = useMutation<TData, unknown, TForm>({
    mutationKey,
    mutationFn: async (payload: TForm) => {
      if (!mutationFn) throw new Error('mutationFn is required');
      return await mutationFn(payload);
    },
    onSuccess: async (data) => {
      if (successMessage) notifications.show({ color: 'green', message: successMessage });
      await onSuccess?.(data);
      onClose();
    },
    onError: (err) => {
      if (errorMessage) notifications.show({ color: 'red', message: errorMessage });
      onError?.(err);
    },
  });

  return (
    <Modal opened={open} onClose={onClose} title={title}>
      {!schema ? (
        <Alert color="yellow" mt="sm">Schema not available.</Alert>
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
            setValidationError(null);
            try {
              validate?.(formData as TForm | undefined);
            } catch (err) {
              setValidationError(err);
              return;
            }
            if (!formData) throw new Error('Form data is required');
            void mutation.mutateAsync(formData as TForm);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}

      {!!validationError && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} mt="md">
          {getErrorMessage(validationError)}
        </Alert>
      )}
      {mutation.isError && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} mt="md">
          {getErrorMessage(mutation.error)}
        </Alert>
      )}
    </Modal>
  );
};

const SchemaRequestModal = <TForm,>(props: SchemaRequestModalProps<TForm>) => {
  return <SchemaRequestModalInner {...props} />;
};

export default SchemaRequestModal;
