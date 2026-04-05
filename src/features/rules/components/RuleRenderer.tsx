import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { Button, Badge, Paper, Text, Box, Stack, Group, Accordion } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import { HIDE_KEYS_SINGLE } from '../constants';
import { getRuleDefinitions, isRuleObject } from '../schema';
import { prettifyKey } from '../schema';

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
  <Paper withBorder p="sm" shadow="xs">{children}</Paper>
);

const LabeledBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack gap={2} mb="xs">
    <Text size="sm" c="dimmed">{label}</Text>
    <div>{children}</div>
  </Stack>
);

const PrimitiveView: React.FC<{ value: string | number | boolean | null }> = ({ value }) => (
  <Text ff="monospace" size="xs" style={{ wordBreak: 'break-word' }} span>
    {value === null ? '\u2014' : String(value)}
  </Text>
);

const lastKeyFromPath = (path: string): string => {
  if (!path) return '';
  const parts = path.split('.');
  let last = parts[parts.length - 1] || '';
  last = last.replace(/\[\d+\]$/, '');
  return last;
};

const labelFromPath = (path: string): string => {
  const key = lastKeyFromPath(path);
  return key ? prettifyKey(key) : 'Details';
};

const CodeCollapsible: React.FC<{ title: string; code: string; height?: string; language?: 'python' | 'text' }> = ({
  title,
  code,
  height = '220px',
  language = 'python',
}) => {
  const extensions = language === 'python' ? [python()] : [];
  return (
    <Accordion variant="contained">
      <Accordion.Item value="code">
        <Accordion.Control>
          <Text size="xs" fw={500}>{title}</Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Box style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid var(--mantine-color-default-border)' }}>
            <CodeMirror
              value={code}
              height={height}
              extensions={extensions}
              theme={oneDark}
              readOnly
              basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
            />
          </Box>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

const hasRuleDescendant = (value: unknown, defs: Definitions): boolean => {
  if (!value || typeof value !== 'object') return false;
  if (isRuleObject(value, defs)) return true;
  if (Array.isArray(value)) return value.some((v) => hasRuleDescendant(v, defs));
  return Object.values(value as Record<string, unknown>).some((v) => hasRuleDescendant(v, defs));
};

const ArrayView: React.FC<{
  value: unknown[];
  renderNode: RenderNodeFn;
  path: string;
  options: RenderOptions;
}> = ({ value, renderNode, path, options }) => {
  if (value.length === 0) return <Text ff="monospace" size="xs" c="dimmed">[]</Text>;
  return (
    <Stack gap="xs">
      {value.map((item, idx) => (
        <div key={`${path}[${idx}]`}>{renderNode(item, `${path}[${idx}]`, options)}</div>
      ))}
    </Stack>
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
  const typeVal = String(obj?.type ?? '\u2014');
  const qidValue = obj?.question_id;

  return (
    <RuleContainer>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Badge variant="light" color="gray">{typeVal}</Badge>
          {typeof qidValue === 'string' && (!contextQuestionId || qidValue !== contextQuestionId) && (
            <Badge variant="light" color="gray" ff="monospace" fw={700}>{qidValue}</Badge>
          )}
        </Group>
        {showActions && (onEdit || onDelete) && (
          <Group gap="xs">
            {onEdit && (
              <Button size="xs" leftSection={<IconPencil size={14} />} onClick={() => onEdit(obj as unknown as RuleValue)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(obj as unknown as RuleValue)}>
                Delete
              </Button>
            )}
          </Group>
        )}
      </Group>

      <Stack gap="xs">
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
      </Stack>
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
  if (keys.length === 0) return <Text size="xs" c="dimmed">{'{}'}</Text>;

  const ruleInside = hasRuleDescendant(obj, defs);

  if (!ruleInside) {
    const title = labelFromPath(path);
    return (
      <Accordion variant="contained">
        <Accordion.Item value="detail">
          <Accordion.Control>
            <Text size="xs" fw={500}>{title}</Text>
          </Accordion.Control>
          <Accordion.Panel>
            {keys.map((k) => (
              <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
                {renderNode(obj[k], `${path}.${k}`, options)}
              </LabeledBlock>
            ))}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  }

  return (
    <Paper withBorder p="sm">
      {keys.map((k) => (
        <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
          {renderNode(obj[k], `${path}.${k}`, options)}
        </LabeledBlock>
      ))}
    </Paper>
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

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return <PrimitiveView value={value} />;
  }

  if (typeof value === 'string') {
    if (isCodeKey) {
      const title = prettifyKey(keyName || 'Code');
      return <CodeCollapsible title={title} code={value} />;
    }
    return <PrimitiveView value={value} />;
  }

  if (Array.isArray(value)) {
    return <ArrayView value={value as unknown[]} renderNode={(v, p, opts) => renderNode(v, p, defs, opts)} path={path} options={options} />;
  }

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

  try {
    return <Text ff="monospace" size="xs" style={{ wordBreak: 'break-word' }} span>{JSON.stringify(value)}</Text>;
  } catch {
    return <Text ff="monospace" size="xs" style={{ wordBreak: 'break-word' }} span>{String(value)}</Text>;
  }
};

const RuleRenderer: React.FC<{
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

export default RuleRenderer;
