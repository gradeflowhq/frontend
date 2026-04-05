import { Group, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconFile, IconUpload, IconX } from '@tabler/icons-react';
import React from 'react';

import type { WidgetProps } from '@rjsf/utils';

type Options = {
  readAs?: 'text' | 'binary';
  accept?: string;
  onFileSelected?: (file: File | null) => void; // for binary mode
};

const FileOrTextWidget: React.FC<WidgetProps> = ({
  id,
  value,
  onChange,
  disabled,
  readonly,
  options,
}) => {
  const { readAs = 'text', accept, onFileSelected } = (options || {}) as Options;
  const [fileName, setFileName] = React.useState<string>(typeof value === 'string' && value.length < 200 ? value : '');
  const [loading, setLoading] = React.useState(false);

  const acceptMimes = accept ? accept.split(',').map((s) => s.trim()) : undefined;

  const handleFileChange = async (file: File | null) => {
    setFileName(file?.name ?? '');
    if (!file) {
      if (readAs === 'binary') onFileSelected?.(null);
      onChange(undefined);
      return;
    }
    setLoading(true);
    try {
      if (readAs === 'binary') {
        onFileSelected?.(file);
        onChange(file.name);
      } else {
        const text = await file.text();
        onChange(text);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dropzone
      id={id}
      onDrop={(files) => void handleFileChange(files[0] ?? null)}
      accept={acceptMimes}
      maxFiles={1}
      loading={loading}
      disabled={disabled || readonly}
      p="sm"
    >
      <Group justify="center" gap="xs" mih={64} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept><IconUpload size={18} color="var(--mantine-color-blue-6)" /></Dropzone.Accept>
        <Dropzone.Reject><IconX size={18} color="var(--mantine-color-red-6)" /></Dropzone.Reject>
        <Dropzone.Idle><IconFile size={18} color="var(--mantine-color-dimmed)" /></Dropzone.Idle>
        <div>
          <Text size="sm" inline>
            {fileName ? fileName : 'Drop file here or click to select'}
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
};

export default FileOrTextWidget;