import { Alert, Modal } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';

import { saveBlob } from '@lib/files';
import { getErrorMessage, isNotFoundError } from '@utils/error';
import { notifySuccess } from '@utils/notifications';

import HiddenAwareFieldTemplate from './HiddenAwareFieldTemplate';
import { SchemaForm, type SchemaFormProps } from './SchemaForm';

type DownloadResponse = {
  filename: string;
  data: Blob | BlobPart;
  media_type: string;
};

type Props<TForm, TData extends DownloadResponse> = {
  open: boolean;
  title: string;
  schema: Record<string, unknown> | null;
  onClose: () => void;
  mutationKey: readonly unknown[];
  mutationFn: (payload: TForm) => Promise<TData>;
  initialValues?: () => TForm | undefined;
  buildUiSchema?: (formData: TForm | undefined) => SchemaFormProps<TForm>['uiSchema'];
  templates?: SchemaFormProps<TForm>['templates'];
  submitIdleLabel?: React.ReactNode;
  submitLoadingLabel?: React.ReactNode;
  successMessage?: string;
  notFoundMessage?: React.ReactNode;
};

const SchemaDownloadModalInner = <TForm, TData extends DownloadResponse>({
  open,
  title,
  schema,
  onClose,
  mutationKey,
  mutationFn,
  initialValues,
  buildUiSchema,
  templates,
  submitIdleLabel = 'Download',
  submitLoadingLabel = 'Downloading…',
  successMessage = 'Download started',
  notFoundMessage,
}: Props<TForm, TData>) => {
  React.useEffect(() => {
    if (!open) return;
    setFormData(initialValues?.());
    mutation.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [formData, setFormData] = useState<TForm | undefined>(() => initialValues?.());
  const uiSchema = useMemo(() => buildUiSchema?.(formData), [buildUiSchema, formData]);
  const mergedTemplates = useMemo(
    () => ({ FieldTemplate: HiddenAwareFieldTemplate, ...(templates || {}) }),
    [templates],
  );

  const mutation = useMutation<TData, unknown, TForm>({
    mutationKey,
    mutationFn,
    onSuccess: (data) => {
      const blob = data.data instanceof Blob
        ? data.data
        : new Blob([data.data], { type: data.media_type || 'application/octet-stream' });
      saveBlob(blob, data.filename);
      notifySuccess(successMessage);
      onClose();
    },
  });

  const errorMessage = mutation.isError && isNotFoundError(mutation.error) && notFoundMessage
    ? notFoundMessage
    : getErrorMessage(mutation.error);

  return (
    <Modal opened={open} onClose={onClose} title={title}>
      {!schema ? (
        <Alert color="yellow" mt="sm">Schema not available.</Alert>
      ) : (
        <SchemaForm<TForm>
          schema={schema}
          uiSchema={uiSchema}
          templates={mergedTemplates}
          formData={formData}
          onChange={({ formData: nextFormData }) => setFormData(nextFormData)}
          isSubmitting={mutation.isPending}
          submitIdleLabel={submitIdleLabel}
          submitLoadingLabel={submitLoadingLabel}
          onSubmit={({ formData: nextFormData }) => {
            if (!nextFormData) throw new Error('Form data is required');
            void mutation.mutateAsync(nextFormData);
          }}
          formProps={{ noHtml5Validate: true }}
        />
      )}

      {mutation.isError && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} mt="md">
          {errorMessage}
        </Alert>
      )}
    </Modal>
  );
};

export default SchemaDownloadModalInner;