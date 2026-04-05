import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { Text } from '@mantine/core';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import type { WidgetProps } from '@rjsf/utils';

type EditorOptions = {
  language?: 'python' | 'text';
  height?: string;
  placeholder?: string;
  readOnly?: boolean;
};

const CodeEditorWidget: React.FC<WidgetProps> = ({
  id,
  value,
  disabled,
  readonly,
  placeholder,
  onChange,
  onBlur,
  onFocus,
  label,
  hideLabel,
  options,
}) => {
  const opts = (options || {}) as EditorOptions;
  const height = opts.height ?? '220px';
  const isReadOnly = disabled || readonly || opts.readOnly;
  const isPython = (opts.language ?? 'python') === 'python';

  return (
    <div>
      {!hideLabel && label && (
        <Text size="sm" fw={500} mb={4}>{label}</Text>
      )}
      <div style={{ borderRadius: 'var(--mantine-radius-sm)', border: '1px solid var(--mantine-color-default-border)', overflow: 'hidden' }}>
        <CodeMirror
          id={id}
          value={typeof value === 'string' ? value : ''}
          theme={oneDark}
          height={height}
          extensions={isPython ? [python()] : []}
          readOnly={isReadOnly}
          placeholder={opts.placeholder ?? placeholder}
          onChange={(val) => onChange(val)}
          onBlur={() => onBlur?.(id, value)}
          onFocus={() => onFocus?.(id, value)}
          basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
        />
      </div>
    </div>
  );
};

export default CodeEditorWidget;