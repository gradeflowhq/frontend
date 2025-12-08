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
  const [fileName, setFileName] = React.useState<string>(typeof value === 'string' ? value : '');

  return (
    <div className="form-control">
      <input
        id={id}
        type="file"
        className="file-input file-input-bordered w-full"
        accept={accept}
        disabled={disabled || readonly}
        onChange={async (e) => {
          const f = e.target.files?.[0] ?? null;
          setFileName(f?.name ?? '');
          if (!f) {
            if (readAs === 'binary') onFileSelected?.(null);
            onChange(undefined);
            return;
          }
          if (readAs === 'binary') {
            onFileSelected?.(f);
            onChange(f.name); // keep user-friendly value in formData
          } else {
            const text = await f.text();
            onChange(text); // upload expects a string body
          }
        }}
      />
      {fileName && <div className="text-xs mt-1 font-mono">{fileName}</div>}
    </div>
  );
};

export default FileOrTextWidget;