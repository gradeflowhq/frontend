import React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import CodeEditorWidget from './CodeEditorWidget';

type EditorOptions = {
  editor?: boolean;
  language?: 'python' | 'text';
  height?: string;
  placeholder?: string;
  readOnly?: boolean;
};

const matchesCode = (props: WidgetProps) => {
  const { id, label, schema } = props;
  const keyGuess = id?.split('_').pop() ?? '';
  const titleGuess = (schema as any)?.title ?? label ?? '';
  return /code/i.test(keyGuess) || /code/i.test(String(titleGuess));
};

const SwitchableTextWidget: React.FC<WidgetProps> = (props) => {
  const {
    id,
    value,
    disabled,
    readonly,
    placeholder,
    onChange,
    onBlur,
    onFocus,
    options,
    schema,
  } = props;

  const opts = (options || {}) as EditorOptions;
  const useEditor = opts.editor === true || matchesCode(props);

  if (!useEditor) {
    // Prefer current value, then schema.default, else ''
    const raw = value ?? (schema as any)?.default ?? '';
    const display = typeof raw === 'string' ? raw : String(raw);

    return (
      <div className="form-control">
        <input
          id={id}
          type="text"
          className="input input-bordered w-full"
          value={display}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(id, e.target.value)}
          onFocus={(e) => onFocus?.(id, e.target.value)}
          placeholder={opts.placeholder ?? placeholder}
          disabled={disabled}
          readOnly={readonly}
        />
      </div>
    );
  }

  // Delegate to the code editor (which should also use schema.default fallback internally)
  return <CodeEditorWidget {...props} />;
};

export default SwitchableTextWidget;