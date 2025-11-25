import React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

type EditorOptions = {
  language?: 'python' | 'text';
  height?: string;
  placeholder?: string;
  readOnly?: boolean;
};

const CodeEditorWidget: React.FC<WidgetProps> = ({
  id,
  value,
  required,
  disabled,
  readonly,
  label,
  placeholder,
  onChange,
  onBlur,
  onFocus,
  options,
}) => {
  const opts = (options || {}) as EditorOptions;
  const height = opts.height ?? '220px';
  const isReadOnly = disabled || readonly || opts.readOnly;
  const isPython = (opts.language ?? 'python') === 'python';

  return (
    <div className="form-control">
      <div className="rounded-md border border-base-300 overflow-hidden">
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