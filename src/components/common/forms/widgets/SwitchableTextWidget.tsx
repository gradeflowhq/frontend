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
  const titleGuess = typeof schema === 'object' && schema !== null && 'title' in schema
    ? (schema as { title?: unknown }).title
    : undefined;
  return /code/i.test(keyGuess) || /code/i.test(String(titleGuess ?? label ?? ''));
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

  const opts: EditorOptions = {
    editor: options?.editor === true,
    language: options?.language === 'python' ? 'python' : options?.language === 'text' ? 'text' : undefined,
    height: typeof options?.height === 'string' ? options.height : undefined,
    placeholder: typeof options?.placeholder === 'string' ? options.placeholder : undefined,
    readOnly: typeof options?.readOnly === 'boolean' ? options.readOnly : undefined,
  };
  const useEditor = opts.editor === true || matchesCode(props);

  if (!useEditor) {
    // Prefer current value, then schema.default, else ''
    const schemaDefault = typeof schema === 'object' && schema !== null && 'default' in schema
      ? (schema as { default?: unknown }).default
      : undefined;
    const raw = value ?? schemaDefault ?? '';
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