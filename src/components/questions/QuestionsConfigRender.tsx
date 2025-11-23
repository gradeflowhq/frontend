import React from 'react';
import { prettifyKey } from '../../utils/rulesHelpers';

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
  value: any[];
  renderNode: (v: any, path: string) => React.ReactNode;
  path: string;
}> = ({ value, renderNode, path }) => {
  if (value.length === 0) return <span className="font-mono text-xs opacity-70">[]</span>;
  return (
    <div className="space-y-2">
      {value.map((item, idx) => (
        <div key={`${path}[${idx}]`}>{renderNode(item, `${path}[${idx}]`)}</div>
      ))}
    </div>
  );
};

// Standard collapsible (boxed) for inner "config"
const CollapsibleConfigBox: React.FC<{
  obj: any;
  path: string;
  renderNode: (v: any, p: string) => React.ReactNode;
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

const renderNode = (value: any, path: string): React.ReactNode => {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return <PrimitiveView value={value} />;
  }
  if (Array.isArray(value)) {
    return <ArrayView value={value} renderNode={(v, p) => renderNode(v, p)} path={path} />;
  }
  if (value && typeof value === 'object') {
    // Nested object (non-root): render its fields flat (no outer box),
    // unless it is specifically the inner "config", which should be collapsible (boxed).
    const keyName = path.split('.').pop() || '';
    if (keyName.toLowerCase() === 'config') {
      return (
        <CollapsibleConfigBox
          obj={value}
          path={path}
          renderNode={(v, p) => renderNode(v, p)}
          title="Config"
          defaultOpen={false}
        />
      );
    }

    const keys = Object.keys(value ?? {}).filter((k) => !HIDE_KEYS.has(k));
    if (keys.length === 0) return <span className="opacity-60 text-xs">{'{}'}</span>;

    return (
      <>
        {keys.map((k) => (
          <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
            {renderNode(value[k], `${path}.${k}`)}
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

const QuestionsConfigRender: React.FC<{ value: any }> = ({ value }) => {
  if (!value || typeof value !== 'object') {
    return <PrimitiveView value={value ?? null} />;
  }

  const keys = Object.keys(value ?? {}).filter((k) => !HIDE_KEYS.has(k));
  if (keys.length === 0) {
    return <span className="opacity-60 text-xs">{'{}'}</span>;
  }

  return (
    <>
      {keys.map((k) => (
        <LabeledBlock key={`$.${k}`} label={prettifyKey(k)}>
          {renderNode(value[k], `$.${k}`)}
        </LabeledBlock>
      ))}
    </>
  );
};

export default QuestionsConfigRender;