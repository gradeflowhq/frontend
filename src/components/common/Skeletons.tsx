import {
  Box,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@mantine/core';
import React from 'react';

import MasterDetailLayout from './MasterDetailLayout';

type SkeletonWidth = React.ComponentProps<typeof Skeleton>['width'];

type SkeletonHeight = React.ComponentProps<typeof Skeleton>['height'];
type IndexedValue<T> = T | readonly T[] | ((index: number) => T);

type SkeletonLine = {
  height?: SkeletonHeight;
  width?: SkeletonWidth;
  radius?: React.ComponentProps<typeof Skeleton>['radius'];
};

type TableSecondaryLine = SkeletonLine & {
  columns?: readonly number[] | ((row: number, column: number) => boolean);
};

type FormFieldSkeleton = {
  labelWidth?: SkeletonWidth;
  inputHeight?: SkeletonHeight;
};

const frameStyle: React.CSSProperties = {
  border: '1px solid var(--mantine-color-default-border)',
  borderRadius: 'var(--mantine-radius-sm)',
  overflow: 'hidden',
};

const indexes = (count: number): number[] => Array.from({ length: count }, (_, index) => index);

const valueAt = <T,>(value: IndexedValue<T> | undefined, index: number, fallback: T): T => {
  if (typeof value === 'function') return (value as (index: number) => T)(index);
  if (Array.isArray(value)) {
    const values = value as readonly T[];
    return values[index % values.length] ?? fallback;
  }
  if (value === undefined) return fallback;
  return value as T;
};

const shouldRenderSecondaryLine = (
  rule: TableSecondaryLine['columns'],
  row: number,
  column: number,
): boolean => {
  if (typeof rule === 'function') return rule(row, column);
  if (Array.isArray(rule)) return rule.includes(column);
  return false;
};

export const TableSkeleton: React.FC<{
  columns?: number;
  rows?: number;
  columnTemplate?: string;
  minWidth?: number;
  withFooter?: boolean;
  footerLabelWidth?: SkeletonWidth;
  footerActionWidth?: SkeletonWidth;
  headerLine?: SkeletonLine;
  headerWidths?: IndexedValue<SkeletonWidth>;
  cellLine?: SkeletonLine;
  cellWidths?: IndexedValue<SkeletonWidth>;
  secondaryLine?: TableSecondaryLine;
  secondaryWidths?: IndexedValue<SkeletonWidth>;
  rowPadding?: React.CSSProperties['padding'];
  headerPadding?: React.CSSProperties['padding'];
  columnGap?: React.CSSProperties['columnGap'];
  ariaLabel?: string;
}> = ({
  columns = 4,
  rows = 8,
  columnTemplate,
  minWidth,
  withFooter = false,
  footerLabelWidth = 56,
  footerActionWidth = 88,
  headerLine,
  headerWidths,
  cellLine,
  cellWidths,
  secondaryLine,
  secondaryWidths,
  rowPadding = 12,
  headerPadding = '10px 12px',
  columnGap = 16,
  ariaLabel = 'Loading table',
}) => {
  const template = columnTemplate ?? `repeat(${columns}, minmax(88px, 1fr))`;

  return (
    <Stack gap="sm" aria-label={ariaLabel}>
      <Box style={{ overflowX: 'auto' }}>
        <Box style={{ ...frameStyle, minWidth }}>
          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: template,
              columnGap,
              padding: headerPadding,
              borderBottom: '1px solid var(--mantine-color-default-border)',
              background: 'var(--mantine-color-default-hover)',
            }}
          >
            {indexes(columns).map((column) => (
              <Skeleton
                key={column}
                height={headerLine?.height ?? 10}
                width={valueAt(headerWidths, column, headerLine?.width ?? '100%')}
                radius={headerLine?.radius}
              />
            ))}
          </Box>

          {indexes(rows).map((row) => (
            <Box
              key={row}
              style={{
                display: 'grid',
                gridTemplateColumns: template,
                columnGap,
                padding: rowPadding,
                borderBottom:
                  row === rows - 1 ? undefined : '1px solid var(--mantine-color-default-border)',
              }}
            >
              {indexes(columns).map((column) => (
                <Stack key={column} gap={5}>
                  <Skeleton
                    height={cellLine?.height ?? 12}
                    width={valueAt(cellWidths, row * columns + column, cellLine?.width ?? '100%')}
                    radius={cellLine?.radius}
                  />
                  {shouldRenderSecondaryLine(secondaryLine?.columns, row, column) && (
                    <Skeleton
                      height={secondaryLine?.height ?? 6}
                      width={valueAt(
                        secondaryWidths,
                        row * columns + column,
                        secondaryLine?.width ?? '80%',
                      )}
                      radius={secondaryLine?.radius}
                    />
                  )}
                </Stack>
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      {withFooter && (
        <Group justify="flex-end">
          <Skeleton height={12} width={footerLabelWidth} />
          <Skeleton height={30} width={footerActionWidth} radius="sm" />
        </Group>
      )}
    </Stack>
  );
};

export const MetricCardsSkeleton: React.FC<{
  cards?: number;
  cols?: React.ComponentProps<typeof SimpleGrid>['cols'];
  labelWidths?: IndexedValue<SkeletonWidth>;
  valueWidths?: IndexedValue<SkeletonWidth>;
  metaWidths?: IndexedValue<SkeletonWidth>;
  withMeta?: boolean;
}> = ({
  cards = 4,
  cols,
  labelWidths,
  valueWidths,
  metaWidths,
  withMeta = true,
}) => (
  <SimpleGrid cols={cols ?? { base: 2, sm: cards }} spacing="sm" aria-label="Loading metrics">
    {indexes(cards).map((index) => (
      <Paper key={index} withBorder p="sm">
        <Skeleton height={10} width={valueAt(labelWidths, index, 64)} mb={8} />
        <Skeleton height={22} width={valueAt(valueWidths, index, 72)} mb={6} />
        {withMeta && <Skeleton height={10} width={valueAt(metaWidths, index, 56)} />}
      </Paper>
    ))}
  </SimpleGrid>
);

export const ChartCardSkeleton: React.FC<{
  titleWidth?: SkeletonWidth;
  withToolbar?: boolean;
  toolbarLabelWidth?: SkeletonWidth;
  toolbarControlWidth?: SkeletonWidth;
  legendWidths?: readonly SkeletonWidth[];
  chartHeight?: SkeletonHeight;
  barHeights?: readonly number[];
  withFooter?: boolean;
  footerItems?: number;
  footerLineWidths?: readonly [SkeletonWidth, SkeletonWidth, SkeletonWidth];
}> = ({
  titleWidth = 120,
  withToolbar = false,
  toolbarLabelWidth = 56,
  toolbarControlWidth = 110,
  legendWidths,
  chartHeight = 220,
  barHeights,
  withFooter = false,
  footerItems = 3,
  footerLineWidths = [28, 48, 40],
}) => (
  <Card withBorder p="sm" aria-label="Loading chart">
    <Group justify="space-between" mb={8} align="center">
      <Skeleton height={12} width={titleWidth} />
      {withToolbar && (
        <Group gap="xs" align="center">
          <Skeleton height={12} width={toolbarLabelWidth} />
          <Skeleton height={30} width={toolbarControlWidth} radius="sm" />
        </Group>
      )}
    </Group>

    {legendWidths && (
      <Group gap={16} mb={10}>
        {legendWidths.map((width, index) => (
          <Skeleton key={index} height={10} width={width} />
        ))}
      </Group>
    )}

    <Box h={chartHeight} style={{ position: 'relative' }}>
      <Skeleton height="100%" radius="sm" />
      {barHeights && (
        <Group
          align="flex-end"
          gap={8}
          style={{ position: 'absolute', inset: '28px 18px 18px' }}
        >
          {barHeights.map((height, index) => (
            <Skeleton
              key={`${height}-${index}`}
              height={height}
              style={{ flex: 1, alignSelf: 'flex-end' }}
            />
          ))}
        </Group>
      )}
    </Box>

    {withFooter && (
      <Group justify="center" gap="xl" mt={10}>
        {indexes(footerItems).map((index) => (
          <Stack key={index} gap={4} align="center">
            {footerLineWidths.map((width, lineIndex) => (
              <Skeleton
                key={lineIndex}
                height={lineIndex === 1 ? 14 : 10}
                width={width}
              />
            ))}
          </Stack>
        ))}
      </Group>
    )}
  </Card>
);

const MasterListSkeleton: React.FC<{
  rows: number;
  withAction: boolean;
  withBadges: boolean;
  rowHeight: number;
  rowLineWidths?: IndexedValue<SkeletonWidth>;
  badgeWidths?: IndexedValue<SkeletonWidth>;
  secondaryBadgeWidths?: IndexedValue<SkeletonWidth>;
  showSecondaryBadge?: (row: number) => boolean;
  ariaLabel: string;
}> = ({
  rows,
  withAction,
  withBadges,
  rowHeight,
  rowLineWidths,
  badgeWidths,
  secondaryBadgeWidths,
  showSecondaryBadge,
  ariaLabel,
}) => (
  <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
    {withAction && (
      <Box pb={4}>
        <Skeleton height={30} radius="sm" />
      </Box>
    )}
    <Stack gap={0} aria-label={ariaLabel}>
      {indexes(rows).map((row) => (
        <Box
          key={row}
          px="sm"
          py="xs"
          style={{
            minHeight: rowHeight,
            borderLeft: '4px solid var(--mantine-color-default-border)',
            borderRight: '1px solid var(--mantine-color-default-border)',
          }}
        >
          <Stack gap={withBadges ? 6 : 0}>
            <Skeleton height={12} width={valueAt(rowLineWidths, row, '68%')} />
            {withBadges && (
              <Group gap={4}>
                <Skeleton height={18} width={valueAt(badgeWidths, row, 54)} radius="xl" />
                {showSecondaryBadge?.(row) && (
                  <Skeleton
                    height={18}
                    width={valueAt(secondaryBadgeWidths, row, 38)}
                    radius="xl"
                  />
                )}
              </Group>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  </Box>
);

export const MasterDetailSkeleton: React.FC<{
  listWidth?: string;
  layoutHeight?: string;
  listRows?: number;
  withListAction?: boolean;
  withListBadges?: boolean;
  listRowHeight?: number;
  listRowLineWidths?: IndexedValue<SkeletonWidth>;
  listBadgeWidths?: IndexedValue<SkeletonWidth>;
  listSecondaryBadgeWidths?: IndexedValue<SkeletonWidth>;
  showListSecondaryBadge?: (row: number) => boolean;
  detailPanel: React.ReactNode;
  listAriaLabel?: string;
}> = ({
  listWidth = '170px',
  layoutHeight = 'calc(100dvh - 105px)',
  listRows = 10,
  withListAction = false,
  withListBadges = true,
  listRowHeight = 48,
  listRowLineWidths,
  listBadgeWidths,
  listSecondaryBadgeWidths,
  showListSecondaryBadge,
  detailPanel,
  listAriaLabel = 'Loading list',
}) => (
  <MasterDetailLayout
    listWidth={listWidth}
    layoutHeight={layoutHeight}
    backLabel="Back"
    listPanel={(
      <MasterListSkeleton
        rows={listRows}
        withAction={withListAction}
        withBadges={withListBadges}
        rowHeight={listRowHeight}
        rowLineWidths={listRowLineWidths}
        badgeWidths={listBadgeWidths}
        secondaryBadgeWidths={listSecondaryBadgeWidths}
        showSecondaryBadge={showListSecondaryBadge}
        ariaLabel={listAriaLabel}
      />
    )}
    detailPanel={detailPanel}
  />
);

export const FormFieldsSkeleton: React.FC<{
  fields?: number | readonly FormFieldSkeleton[];
  defaultField?: FormFieldSkeleton;
  withActions?: boolean;
  actionWidths?: readonly [SkeletonWidth, SkeletonWidth];
  ariaLabel?: string;
}> = ({
  fields = 3,
  defaultField,
  withActions = true,
  actionWidths = [84, 76],
  ariaLabel = 'Loading form',
}) => {
  const fieldList = typeof fields === 'number'
    ? indexes(fields).map(() => defaultField ?? {})
    : fields;

  return (
    <Stack gap="sm" aria-label={ariaLabel}>
      {fieldList.map((field, index) => (
        <Stack key={index} gap={6}>
          <Skeleton height={12} width={field.labelWidth ?? 96} />
          <Skeleton height={field.inputHeight ?? 36} radius="sm" />
        </Stack>
      ))}
      {withActions && (
        <Group justify="flex-end" gap="sm" mt="sm">
          <Skeleton height={36} width={actionWidths[0]} radius="sm" />
          <Skeleton height={36} width={actionWidths[1]} radius="sm" />
        </Group>
      )}
    </Stack>
  );
};

export const CollapsedAccordionSkeleton: React.FC<{
  labelWidth?: SkeletonWidth;
  controlWidth?: SkeletonWidth;
  ariaLabel?: string;
}> = ({ labelWidth = 128, controlWidth = 14, ariaLabel = 'Loading collapsed panel' }) => (
  <Box style={frameStyle} aria-label={ariaLabel}>
    <Group justify="space-between" p="sm" align="center">
      <Skeleton height={14} width={labelWidth} />
      <Skeleton height={14} width={controlWidth} />
    </Group>
  </Box>
);

export const AccordionPanelsSkeleton: React.FC<{
  items?: number;
  labelWidths?: IndexedValue<SkeletonWidth>;
  summaryWidths?: IndexedValue<SkeletonWidth | null>;
  withLeadingIcon?: boolean;
  openItem?: number | null;
  openContent?: React.ReactNode;
  ariaLabel?: string;
}> = ({
  items = 4,
  labelWidths,
  summaryWidths,
  withLeadingIcon = true,
  openItem = null,
  openContent,
  ariaLabel = 'Loading panels',
}) => (
  <Stack gap="xs" aria-label={ariaLabel}>
    {indexes(items).map((index) => {
      const summaryWidth = valueAt(summaryWidths, index, null);

      return (
        <Box key={index} style={frameStyle}>
          <Group justify="space-between" p="sm">
            <Group gap="xs">
              {withLeadingIcon && <Skeleton height={16} width={16} circle />}
              <Skeleton height={14} width={valueAt(labelWidths, index, 120)} />
              {summaryWidth && <Skeleton height={12} width={summaryWidth} />}
            </Group>
            <Skeleton height={14} width={14} />
          </Group>
          {openItem === index && openContent}
        </Box>
      );
    })}
  </Stack>
);
