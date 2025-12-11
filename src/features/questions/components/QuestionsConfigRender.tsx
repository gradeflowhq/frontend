import React from 'react';
import { prettifyKey } from '@features/rules/helpers';

interface JsonObject {
  [key: string]: JsonValue;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

const HIDE_KEYS = new Set<string>(['type']);

const LabeledBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <div className="text-xs opacity-70 mb-1">{label}</div>
    <div>{children}</div>
  </div>
);

const PrimitiveView: React.FC<{ value: string | number | boolean | null }> = ({ value }) => (
  <span className="font-mono text-xs break-words">{value === null ? '—' : String(value)}</span>
);

const ArrayView: React.FC<{
  value: JsonValue[];
  renderNode: (v: JsonValue, path: string) => React.ReactNode;
  path: string;
}> = ({ value, renderNode, path }) => {
  if (value.length === 0) return <span className="font-mono text-xs opacity-70">[]</span>;
  return (
    <ul className={`list bg-base-100 rounded-box border border-base-300 mb-2`}>
      {value.map((item, idx) => (
        <li className='list-row' key={`${path}[${idx}]`}>
          <div className="font-mono text-xs opacity-50">{idx+1}</div>
          {renderNode(item, `${path}[${idx}]`)}
        </li>
      ))}
    </ul>
  );
};

// Standard collapsible (boxed) for inner "config"
const CollapsibleConfigBox: React.FC<{
  obj: JsonObject;
  path: string;
  renderNode: (v: JsonValue, p: string) => React.ReactNode;
  title?: string;
  defaultOpen?: boolean;
}> = ({ obj, path, renderNode, title = 'Configuration', defaultOpen = false }) => {
  const keys = Object.keys(obj ?? {}).filter((k) => !HIDE_KEYS.has(k));
  if (keys.length === 0) return <span className="opacity-60 text-xs">{'{}'}</span>;

  return (
    <div className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box">
      <input type="checkbox" defaultChecked={defaultOpen} />
      <div className="collapse-title text-xs font-medium">{title}</div>
      <div className="collapse-content">
        {keys.map((k) => (
          <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
            {renderNode(obj[k], `${path}.${k}`)}
          </LabeledBlock>
        ))}
      </div>
    </div>
  );
};

const renderNode = (value: JsonValue, path: string): React.ReactNode => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <PrimitiveView value={value} />;
  }
  if (Array.isArray(value)) {
    return <ArrayView value={value} renderNode={(v, p) => renderNode(v, p)} path={path} />;
  }
  if (value && typeof value === 'object') {
    const obj = value as JsonObject;
    const keyName = path.split('.').pop() || '';
    if (keyName.toLowerCase() === 'config') {
      return (
        <CollapsibleConfigBox
          obj={obj}
          path={path}
          renderNode={(v, p) => renderNode(v, p)}
          title="Config"
          defaultOpen={false}
        />
      );
    }

    const keys = Object.keys(obj ?? {}).filter((k) => !HIDE_KEYS.has(k));
    if (keys.length === 0) return <span className="opacity-60 text-xs">{'{}'}</span>;

    return (
      <>
        {keys.map((k) => (
          <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
            {renderNode(obj[k] as JsonValue, `${path}.${k}`)}
          </LabeledBlock>
        ))}
      </>
    );
  }
  try {
    return <span className="font-mono text-xs break-words">{JSON.stringify(value)}</span>;
  } catch {
    return <span className="font-mono text-xs break-words">{String(value)}</span>;
  }
};

const QuestionsConfigRender: React.FC<{ value: JsonValue }> = ({ value }) => {
  if (!value || typeof value !== 'object') {
    const primitive = (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      ? value
      : null;
    return <PrimitiveView value={primitive} />;
  }

  const keys = Object.keys(value ?? {}).filter((k) => !HIDE_KEYS.has(k));
  if (keys.length === 0) {
    return <span className="opacity-60 text-xs">{'{}'}</span>;
  }

  const obj = value as JsonObject;

  return (
    <>
      {keys.map((k) => (
        <LabeledBlock key={`$.${k}`} label={prettifyKey(k)}>
          {renderNode(obj[k] as JsonValue, `$.${k}`)}
        </LabeledBlock>
      ))}
    </>
  );
};

export type { JsonValue };

export default QuestionsConfigRender;