import { Badge, Box, Button, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import React, { lazy, Suspense } from 'react';

import { prettifyKey } from '@utils/format';

import { CODE_INPUT, GRADEFLOW_INPUT_KEY, GRADEFLOW_KEY } from '../schemaHints';

const CodeCollapsible = lazy(() => import('./CodeCollapsible'));

import type { RuleValue } from '../types';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

type RenderOptions = {
  rootSchema: JSONSchema7 | null;
  showActions?: boolean;
  onEdit?: (rule: RuleValue) => void;
  onDelete?: (rule: RuleValue) => void;
  hideRootType?: boolean;
  flatRoot?: boolean;
};

type RenderNodeFn = (
  value: unknown,
  schema: JSONSchema7Definition | null,
  path: string,
  options: RenderOptions,
) => React.ReactNode;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSchema = (schema: unknown): schema is JSONSchema7 =>
  typeof schema === 'object' && schema !== null && !Array.isArray(schema);

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const decodePointerSegment = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

const resolveRef = (
  schema: JSONSchema7Definition | null | undefined,
  root: JSONSchema7 | null,
): JSONSchema7 | null => {
  if (!isSchema(schema)) return null;
  const ref = schema.$ref;
  if (!root || typeof ref !== 'string' || !ref.startsWith('#/')) return schema;

  const resolved = ref
    .slice(2)
    .split('/')
    .map(decodePointerSegment)
    .reduce<unknown>((current, segment) => (
      isRecord(current) ? current[segment] : undefined
    ), root);

  return isSchema(resolved) ? resolved : schema;
};

const unionOptions = (
  schema: JSONSchema7,
): JSONSchema7Definition[] => {
  if (Array.isArray(schema.oneOf)) return schema.oneOf;
  if (Array.isArray(schema.anyOf)) return schema.anyOf;
  return [];
};

const constProperties = (
  schema: JSONSchema7,
  root: JSONSchema7 | null,
): [string, JSONSchema7][] => {
  const properties = schema.properties;
  if (!properties) return [];

  return Object.entries(properties).flatMap(([key, child]) => {
    const resolved = resolveRef(child, root);
    return resolved && hasOwn(resolved, 'const') ? [[key, resolved]] : [];
  });
};

const matchesConstProperties = (
  schema: JSONSchema7,
  value: unknown,
  root: JSONSchema7 | null,
): boolean => {
  if (!isRecord(value)) return false;
  const entries = constProperties(schema, root);
  return entries.length > 0 && entries.every(([key, child]) => value[key] === child.const);
};

const schemaForValue = (
  schema: JSONSchema7Definition | null,
  value: unknown,
  root: JSONSchema7 | null,
): JSONSchema7 | null => {
  const resolved = resolveRef(schema, root);
  if (!resolved) return null;

  const options = unionOptions(resolved);
  if (options.length === 0) return resolved;

  const match = options.find((option) => {
    const optionSchema = resolveRef(option, root);
    return optionSchema ? matchesConstProperties(optionSchema, value, root) : false;
  });

  return match ? resolveRef(match, root) : null;
};

const isHiddenSchema = (
  schema: JSONSchema7Definition,
  root: JSONSchema7 | null,
): boolean => {
  const resolved = resolveRef(schema, root);
  return resolved?.readOnly === true;
};

const inputForSchema = (
  schema: JSONSchema7 | null,
): unknown => {
  const metadata = (schema as Record<string, unknown> | null)?.[GRADEFLOW_KEY];
  return isRecord(metadata) ? metadata[GRADEFLOW_INPUT_KEY] : undefined;
};

const schemaTitle = (
  schema: JSONSchema7 | null,
): string | null => (typeof schema?.title === 'string' ? schema.title : null);

const fieldLabel = (
  key: string,
  schema: JSONSchema7Definition,
  root: JSONSchema7 | null,
): string => schemaTitle(resolveRef(schema, root)) ?? prettifyKey(key);

const itemSchema = (
  schema: JSONSchema7 | null,
): JSONSchema7Definition | null => {
  const items = schema?.items;
  return isSchema(items) ? items : null;
};

const additionalPropertySchema = (
  schema: JSONSchema7 | null,
): JSONSchema7Definition | null => {
  const additionalProperties = schema?.additionalProperties;
  return isSchema(additionalProperties) ? additionalProperties : null;
};

const objectEntries = (
  obj: Record<string, unknown>,
  schema: JSONSchema7,
  root: JSONSchema7 | null,
): { key: string; label: string; schema: JSONSchema7Definition | null; value: unknown }[] => {
  const properties = schema.properties ?? {};
  const entries = Object.entries(properties).flatMap(([key, child]) => {
    if (!hasOwn(obj, key) || isHiddenSchema(child, root)) return [];
    return [{ key, label: fieldLabel(key, child, root), schema: child, value: obj[key] }];
  });

  const additionalSchema = additionalPropertySchema(schema);
  if (!additionalSchema) return entries;

  const schemaKeys = new Set(Object.keys(properties));
  return [
    ...entries,
    ...Object.entries(obj)
      .filter(([key]) => !schemaKeys.has(key))
      .map(([key, value]) => ({
        key,
        label: prettifyKey(key),
        schema: additionalSchema,
        value,
      })),
  ];
};

const RuleContainer: React.FC<{
  children: React.ReactNode;
  isRoot?: boolean;
  flatRoot?: boolean;
}> = ({ children, isRoot, flatRoot }) => (
  isRoot && flatRoot ? (
    <Box>{children}</Box>
  ) : (
    <Box p="xs" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 4 }}>
      {children}
    </Box>
  )
);

const LabeledBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Stack gap={2} mb="xs">
    <Text size="sm" c="dimmed">{label}</Text>
    <div>{children}</div>
  </Stack>
);

const PrimitiveView: React.FC<{ value: string | number | boolean | null }> = ({ value }) => (
  <Text style={{ wordBreak: 'break-word' }} span>
    {value === null ? '\u2014' : String(value)}
  </Text>
);

const ArrayView: React.FC<{
  value: unknown[];
  schema: JSONSchema7 | null;
  renderNode: RenderNodeFn;
  path: string;
  options: RenderOptions;
}> = ({ value, schema, renderNode, path, options }) => {
  if (value.length === 0) return <Text c="dimmed">[]</Text>;
  const childSchema = itemSchema(schema);

  return (
    <Stack gap="xs">
      {value.map((item, idx) => (
        <div key={`${path}.${idx}`}>
          {renderNode(item, childSchema, `${path}.${idx}`, options)}
        </div>
      ))}
    </Stack>
  );
};

const CodeCollapsibleSkeleton: React.FC = () => (
  <Box style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 4 }}>
    <Group justify="space-between" p="sm">
      <Skeleton height={12} width={96} />
      <Skeleton height={14} width={14} />
    </Group>
  </Box>
);

const SchemaObjectView: React.FC<{
  obj: Record<string, unknown>;
  schema: JSONSchema7;
  path: string;
  renderNode: RenderNodeFn;
  options: RenderOptions;
}> = ({ obj, schema, path, renderNode, options }) => {
  const {
    showActions,
    onEdit,
    onDelete,
    hideRootType,
    flatRoot,
    rootSchema,
  } = options;
  const isRoot = path === '$';
  const title = schemaTitle(schema);
  const showTitle = Boolean(title && !(isRoot && hideRootType));
  const showActionButtons = !!(showActions && (onEdit || onDelete));
  const entries = objectEntries(obj, schema, rootSchema);

  return (
    <RuleContainer isRoot={isRoot} flatRoot={flatRoot}>
      {(showTitle || showActionButtons) && (
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            {showTitle && <Badge variant="light" color="gray">{title}</Badge>}
          </Group>
          {showActionButtons && (
            <Group gap="xs">
              {onEdit && (
                <Button leftSection={<IconPencil size={14} />} onClick={() => onEdit(obj as RuleValue)}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(obj as RuleValue)}>
                  Delete
                </Button>
              )}
            </Group>
          )}
        </Group>
      )}

      {entries.length === 0 ? (
        <Text c="dimmed">{'{}'}</Text>
      ) : (
        <Stack gap="xs">
          {entries.map((entry) => (
            <LabeledBlock key={`${path}.${entry.key}`} label={entry.label}>
              {renderNode(entry.value, entry.schema, `${path}.${entry.key}`, options)}
            </LabeledBlock>
          ))}
        </Stack>
      )}
    </RuleContainer>
  );
};

const renderNode = (
  value: unknown,
  schema: JSONSchema7Definition | null,
  path: string,
  options: RenderOptions,
): React.ReactNode => {
  const resolvedSchema = schemaForValue(schema, value, options.rootSchema);

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return <PrimitiveView value={value} />;
  }

  if (typeof value === 'string') {
    if (inputForSchema(resolvedSchema) === CODE_INPUT) {
      return (
        <Suspense fallback={<CodeCollapsibleSkeleton />}>
          <CodeCollapsible title={schemaTitle(resolvedSchema) ?? 'Code'} code={value} />
        </Suspense>
      );
    }
    return <PrimitiveView value={value} />;
  }

  if (Array.isArray(value)) {
    return (
      <ArrayView
        value={value}
        schema={resolvedSchema}
        renderNode={renderNode}
        path={path}
        options={options}
      />
    );
  }

  if (isRecord(value)) {
    if (resolvedSchema) {
      return (
        <SchemaObjectView
          obj={value}
          schema={resolvedSchema}
          path={path}
          renderNode={renderNode}
          options={options}
        />
      );
    }
    return null;
  }

  return null;
};

const RuleRenderer: React.FC<{
  value: RuleValue | unknown;
  schema: JSONSchema7 | null;
  path?: string;
  onEdit?: (rule: RuleValue) => void;
  onDelete?: (rule: RuleValue) => void;
  hideRootType?: boolean;
  flatRoot?: boolean;
}> = ({
  value,
  schema,
  path = '$',
  onEdit,
  onDelete,
  hideRootType = false,
  flatRoot = false,
}) => {
  const rootOptions: RenderOptions = {
    rootSchema: schema,
    showActions: !!(onEdit || onDelete),
    onEdit,
    onDelete,
    hideRootType,
    flatRoot,
  };

  return <>{renderNode(value, schema, path, rootOptions)}</>;
};

export default RuleRenderer;
