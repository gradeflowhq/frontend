import React from 'react';
import { IconEdit, IconTrash } from '../ui/Icon';
import { Button } from '../ui/Button';
import { HIDE_KEYS_SINGLE } from '../../utils/rulesConstants';
import { getRuleDefinitions, isRuleObject, prettifyKey } from '../../utils/rulesHelpers';

/**
 * A small presentational block: label + content.
 */
const LabeledBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-2">
    <div className="text-xs opacity-70 mb-1">{label}</div>
    <div>{children}</div>
  </div>
);

/**
 * Primitive renderer: string | number | boolean | null.
 */
const PrimitiveView: React.FC<{ value: string | number | boolean | null }> = ({ value }) => (
  <span className="font-mono text-xs break-words">{value === null ? '—' : String(value)}</span>
);

/**
 * Utility: derive a label from a path like "$.rules[0].config" -> "Config".
 */
const labelFromPath = (path: string): string => {
  if (!path) return 'Details';
  const parts = path.split('.');
  let last = parts[parts.length - 1] || '';
  // Remove any array index notation
  last = last.replace(/$\d+$$/, '');
  // Fallback
  return last ? prettifyKey(last) : 'Details';
};

/**
 * Check recursively if any descendant is a rule-shaped object.
 */
const hasRuleDescendant = (value: any, defs: Record<string, any>): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (isRuleObject(value, defs)) return true;

  if (Array.isArray(value)) {
    return value.some((v) => hasRuleDescendant(v, defs));
  }
  // Plain object
  return Object.values(value).some((v) => hasRuleDescendant(v, defs));
};

/**
 * Array renderer: recursively render each element.
 */
const ArrayView: React.FC<{
  value: any[];
  renderNode: (v: any, path: string, options: RenderOptions) => React.ReactNode;
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

/**
 * Rule object renderer: header + fields.
 * Shows actions only when showActions is true (root rule).
 */
const RuleObjectView: React.FC<{
  obj: any;
  path: string;
  defs: Record<string, any>;
  renderNode: (v: any, p: string, options: RenderOptions) => React.ReactNode;
  options: RenderOptions;
}> = ({ obj, path, defs, renderNode, options }) => {
  const { contextQuestionId, showActions, onEdit, onDelete } = options;
  const typeVal = obj?.type ?? '—';

  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    (
      <div className="border border-base-300 bg-base-100 rounded-md p-3 shadow-xs">{children}</div>
    );

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="badge badge-ghost">{typeVal}</span>
          {obj?.question_id &&
            (!contextQuestionId || obj.question_id !== contextQuestionId) && (
              <span className="font-mono text-xs badge badge-ghost font-bold">{obj.question_id}</span>
            )}
        </div>
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button size="xs" onClick={() => onEdit(obj)} leftIcon={<IconEdit />}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button size="xs" variant="error" onClick={() => onDelete(obj)} leftIcon={<IconTrash />}>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Fields (recursively rendered; hide standard keys and matching question_id) */}
      <div className="space-y-2">
        {Object.keys(obj).map((k) => {
          if (HIDE_KEYS_SINGLE.includes(k)) return null;
          if (k === 'question_id' && contextQuestionId && obj[k] === contextQuestionId) return null;

          const v = obj[k];
          const title = prettifyKey(k);

          // Nested rules should NOT show actions
          const childOptions: RenderOptions = {
            ...options,
            showActions: false,
          };

          return (
            <LabeledBlock key={`${path}.${k}`} label={title}>
              {renderNode(v, `${path}.${k}`, childOptions)}
            </LabeledBlock>
          );
        })}
      </div>
    </Container>
  );
};

/**
 * Plain object renderer.
 * If the object has no rule descendants, render as a collapsible section.
 * Otherwise, render expanded key/value blocks.
 */
const PlainObjectView: React.FC<{
  obj: any;
  path: string;
  defs: Record<string, any>;
  renderNode: (v: any, p: string, options: RenderOptions) => React.ReactNode;
  options: RenderOptions;
}> = ({ obj, path, defs, renderNode, options }) => {
  const keys = Object.keys(obj ?? {});
  if (keys.length === 0) return <span className="opacity-70 text-xs">{'{}'}</span>;

  const ruleInside = hasRuleDescendant(obj, defs);

  if (!ruleInside) {
    // Collapsible block (DaisyUI collapse)
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

  // Expanded view (object contains rule(s))
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

/**
 * Rendering options, passed recursively to keep behavior consistent and DRY.
 */
type RenderOptions = {
  contextQuestionId?: string | null;
  showActions?: boolean; // root only
  onEdit?: (rule: any) => void; // root only
  onDelete?: (rule: any) => void; // root only
};

/**
 * Unified renderer: primitives, arrays, rule-objects, plain objects.
 * Uses options to control actions and box wrapping without duplicating logic.
 */
const renderNode = (
  value: any,
  path: string,
  defs: Record<string, any>,
  options: RenderOptions
): React.ReactNode => {
  // Primitives
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return <PrimitiveView value={value} />;
  }

  // Arrays
  if (Array.isArray(value)) {
    return (
      <ArrayView
        value={value}
        renderNode={(v, p, opts) => renderNode(v, p, defs, opts)}
        path={path}
        options={options}
      />
    );
  }

  // Objects
  if (value && typeof value === 'object') {
    if (isRuleObject(value, defs)) {
      return (
        <RuleObjectView
          obj={value}
          path={path}
          defs={defs}
          renderNode={(v, p, opts) => renderNode(v, p, defs, opts)}
          options={options}
        />
      );
    }
    return (
      <PlainObjectView
        obj={value}
        path={path}
        defs={defs}
        renderNode={(v, p, opts) => renderNode(v, p, defs, opts)}
        options={options}
      />
    );
  }

  // Fallback: JSON dump
  try {
    return <span className="font-mono text-xs break-words">{JSON.stringify(value)}</span>;
  } catch {
    return <span className="font-mono text-xs break-words">{String(value)}</span>;
  }
};

export const RuleRender: React.FC<{
  value: any;
  path?: string;
  contextQuestionId?: string | null;
  onEdit?: (rule: any) => void; // root actions only
  onDelete?: (rule: any) => void; // root actions only
}> = ({ value, path = '$', contextQuestionId = null, onEdit, onDelete }) => {
  const defs = getRuleDefinitions();

  // Root: show actions and wrap in outermost box
  const rootOptions: RenderOptions = {
    contextQuestionId,
    showActions: !!(onEdit || onDelete),
    onEdit,
    onDelete,
  };

  return <>{renderNode(value, path, defs, rootOptions)}</>;
};

export default RuleRender;