import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { IconEdit, IconTrash } from '@components/ui/Icon';
import { Button } from '@components/ui/Button';
import { HIDE_KEYS_SINGLE } from '../constants';
import { getRuleDefinitions, isRuleObject } from '../helpers';
import { prettifyKey } from '../helpers';
import type { RuleValue } from '../types';
import type { JSONSchema7 } from 'json-schema';

type RenderOptions = {
  contextQuestionId?: string | null;
  showActions?: boolean;
  onEdit?: (rule: RuleValue) => void;
  onDelete?: (rule: RuleValue) => void;
};

type Definitions = Record<string, JSONSchema7>;
type RenderNodeFn = (value: unknown, path: string, options: RenderOptions) => React.ReactNode;

const RuleContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border border-base-300 bg-base-100 rounded-md p-3 shadow-xs">{children}</div>
);

const LabeledBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <div className="text-xs opacity-70 mb-1">{label}</div>
    <div>{children}</div>
  </div>
);

const PrimitiveView: React.FC<{ value: string | number | boolean | null }> = ({ value }) => (
  <span className="font-mono text-xs break-words">{value === null ? '—' : String(value)}</span>
);

// Extract last key segment from a path like "$.rules[0].code"
const lastKeyFromPath = (path: string): string => {
  if (!path) return '';
  const parts = path.split('.');
  let last = parts[parts.length - 1] || '';
  // strip trailing array index [0]
  last = last.replace(/$\d+$$/, '');
  return last;
};

const labelFromPath = (path: string): string => {
  const key = lastKeyFromPath(path);
  return key ? prettifyKey(key) : 'Details';
};

// Collapsible code block (read-only)
const CodeCollapsible: React.FC<{ title: string; code: string; height?: string; language?: 'python' | 'text' }> = ({
  title,
  code,
  height = '220px',
  language = 'python',
}) => {
  const extensions = language === 'python' ? [python()] : [];
  return (
    <div className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box">
      <input type="checkbox" />
      <div className="collapse-title text-xs font-medium">{title}</div>
      <div className="collapse-content">
        <div className="rounded-md border border-base-300 overflow-hidden">
          <CodeMirror
            value={code}
            height={height}
            extensions={extensions}
            theme={oneDark}
            readOnly
            basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
          />
        </div>
      </div>
    </div>
  );
};

const hasRuleDescendant = (value: unknown, defs: Definitions): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (isRuleObject(value, defs)) return true;

  if (Array.isArray(value)) {
    return value.some((v) => hasRuleDescendant(v, defs));
  }
  return Object.values(value as Record<string, unknown>).some((v) => hasRuleDescendant(v, defs));
};

const ArrayView: React.FC<{
  value: unknown[];
  renderNode: RenderNodeFn;
  path: string;
  options: RenderOptions;
}> = ({ value, renderNode, path, options }) => {
  if (value.length === 0) return <span className="font-mono text-xs opacity-70">[]</span>;
  return (
    <div className="space-y-2">
      {value.map((item, idx) => (
        <div key={`${path}[${idx}]`}>{renderNode(item, `${path}[${idx}]`, options)}</div>
      ))}
    </div>
  );
};

const RuleObjectView: React.FC<{
  obj: Record<string, unknown>;
  path: string;
  defs: Definitions;
  renderNode: RenderNodeFn;
  options: RenderOptions;
}> = ({ obj, path, defs: _defs, renderNode, options }) => {
  const { contextQuestionId, showActions, onEdit, onDelete } = options;
  const typeVal = String(obj?.type ?? '—');
  const qidValue = obj?.question_id;

  return (
    <RuleContainer>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="badge badge-ghost">{typeVal}</span>
          {typeof qidValue === 'string' && (!contextQuestionId || qidValue !== contextQuestionId) && (
            <span className="font-mono text-xs badge badge-ghost font-bold">{qidValue}</span>
          )}
        </div>
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button size="xs" onClick={() => onEdit(obj as unknown as RuleValue)}>
                <IconEdit /> Edit
              </Button>
            )}
            {onDelete && (
              <Button size="xs" variant="error" onClick={() => onDelete(obj as unknown as RuleValue)}>
                <IconTrash /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {Object.keys(obj).map((k) => {
          if (HIDE_KEYS_SINGLE.includes(k as (typeof HIDE_KEYS_SINGLE)[number])) return null;
          if (k === 'question_id' && contextQuestionId && obj[k] === contextQuestionId) return null;

          const v = obj[k];
          const title = prettifyKey(k);

          const childOptions: RenderOptions = { ...options, showActions: false };

          return (
            <LabeledBlock key={`${path}.${k}`} label={title}>
              {renderNode(v, `${path}.${k}`, childOptions)}
            </LabeledBlock>
          );
        })}
      </div>
    </RuleContainer>
  );
};

const PlainObjectView: React.FC<{
  obj: Record<string, unknown>;
  path: string;
  defs: Definitions;
  renderNode: RenderNodeFn;
  options: RenderOptions;
}> = ({ obj, path, defs, renderNode, options }) => {
  const keys = Object.keys(obj ?? {});
  if (keys.length === 0) return <span className="opacity-70 text-xs">{'{}'}</span>;

  const ruleInside = hasRuleDescendant(obj, defs);

  if (!ruleInside) {
    const title = labelFromPath(path);
    return (
      <div className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box">
        <input type="checkbox" />
        <div className="collapse-title text-xs font-medium">{title}</div>
        <div className="collapse-content">
          {keys.map((k) => (
            <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
              {renderNode(obj[k], `${path}.${k}`, options)}
            </LabeledBlock>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-base-300 bg-base-100 rounded-md p-3">
      {keys.map((k) => (
        <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
          {renderNode(obj[k], `${path}.${k}`, options)}
        </LabeledBlock>
      ))}
    </div>
  );
};

const renderNode = (
  value: unknown,
  path: string,
  defs: Definitions,
  options: RenderOptions
): React.ReactNode => {
  const keyName = lastKeyFromPath(path);
  const isCodeKey = /code/i.test(keyName);

  // Primitive non-string
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return <PrimitiveView value={value} />;
  }

  // String
  if (typeof value === 'string') {
    if (isCodeKey) {
      const title = prettifyKey(keyName || 'Code');
      return <CodeCollapsible title={title} code={value} />;
    }
    return <PrimitiveView value={value} />;
  }

  // Arrays
  if (Array.isArray(value)) {
    return <ArrayView value={value as unknown[]} renderNode={(v, p, opts) => renderNode(v, p, defs, opts)} path={path} options={options} />;
  }

  // Objects
  if (value && typeof value === 'object') {
    if (isRuleObject(value, defs)) {
      return (
        <RuleObjectView
          obj={value as Record<string, unknown>}
          path={path}
          defs={defs}
          renderNode={(v, p, opts) => renderNode(v, p, defs, opts)}
          options={options}
        />
      );
    }
    return <PlainObjectView obj={value as Record<string, unknown>} path={path} defs={defs} renderNode={(v, p, opts) => renderNode(v, p, defs, opts)} options={options} />;
  }

  // Fallback
  try {
    return <span className="font-mono text-xs break-words">{JSON.stringify(value)}</span>;
  } catch {
    return <span className="font-mono text-xs break-words">{String(value)}</span>;
  }
};

const RuleRender: React.FC<{
  value: RuleValue | unknown;
  path?: string;
  contextQuestionId?: string | null;
  onEdit?: (rule: RuleValue) => void;
  onDelete?: (rule: RuleValue) => void;
}> = ({ value, path = '$', contextQuestionId = null, onEdit, onDelete }) => {
  const defs = getRuleDefinitions();

  const rootOptions: RenderOptions = {
    contextQuestionId,
    showActions: !!(onEdit || onDelete),
    onEdit,
    onDelete,
  };

  return <>{renderNode(value, path, defs, rootOptions)}</>;
};

export default RuleRender;