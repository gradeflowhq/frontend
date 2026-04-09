import { Text, List, Stack, Accordion } from '@mantine/core';
import React from 'react';

import { prettifyKey } from '@features/rules/schema';

interface JsonObject {
  [key: string]: JsonValue;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

const HIDE_KEYS = new Set<string>(['type']);

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

const ArrayView: React.FC<{
  value: JsonValue[];
  renderNode: (v: JsonValue, path: string) => React.ReactNode;
  path: string;
}> = ({ value, renderNode, path }) => {
  if (value.length === 0) return <Text ff="monospace" size="xs" c="dimmed">[]</Text>;
  return (
    <List withPadding mb="xs" listStyleType='none'>
      {value.map((item, idx) => (
        <List.Item key={`${path}[${idx}]`}>
          <Text ff="monospace" size="xs" c="dimmed" span>{idx + 1}. </Text>
          {renderNode(item, `${path}[${idx}]`)}
        </List.Item>
      ))}
    </List>
  );
};

const CollapsibleConfigBox: React.FC<{
  obj: JsonObject;
  path: string;
  renderNode: (v: JsonValue, p: string) => React.ReactNode;
  title?: string;
}> = ({ obj, path, renderNode, title = 'Configuration' }) => {
  const keys = Object.keys(obj ?? {}).filter((k) => !HIDE_KEYS.has(k));
  if (keys.length === 0) return <Text size="xs" c="dimmed">{'{}'}</Text>;

  return (
    <Accordion variant="contained">
      <Accordion.Item value="config">
        <Accordion.Control>
          <Text size="xs" fw={500}>{title}</Text>
        </Accordion.Control>
        <Accordion.Panel>
          {keys.map((k) => (
            <LabeledBlock key={`${path}.${k}`} label={prettifyKey(k)}>
              {renderNode(obj[k], `${path}.${k}`)}
            </LabeledBlock>
          ))}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
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
        />
      );
    }
    const keys = Object.keys(obj ?? {}).filter((k) => !HIDE_KEYS.has(k));
    if (keys.length === 0) return <Text size="xs" c="dimmed">{'{}'}</Text>;
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
    return <Text ff="monospace" size="xs" style={{ wordBreak: 'break-word' }} span>{JSON.stringify(value)}</Text>;
  } catch {
    return <Text ff="monospace" size="xs" style={{ wordBreak: 'break-word' }} span>{String(value)}</Text>;
  }
};

const QuestionConfigPreview: React.FC<{ value: JsonValue }> = ({ value }) => {
  if (!value || typeof value !== 'object') {
    const primitive = (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      ? value
      : null;
    return <PrimitiveView value={primitive} />;
  }

  const keys = Object.keys(value ?? {}).filter((k) => !HIDE_KEYS.has(k));
  if (keys.length === 0) {
    return <Text size="xs" c="dimmed">{'{}'}</Text>;
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
export default QuestionConfigPreview;
