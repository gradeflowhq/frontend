import {
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import React, { useState } from 'react';

import { UnsavedChangesModal } from '@components/common/UnsavedChangesModal';

export interface MasterDetailLayoutProps {
  /** Rendered in the left panel on desktop, or the list view on mobile. */
  listPanel: React.ReactNode;
  /** Rendered in the right panel on desktop, or the detail view on mobile. */
  detailPanel: React.ReactNode;
  /**
   * When true, the mobile back button shows an unsaved-changes guard.
   * Desktop callers manage their own guard (e.g. a pendingQid modal) because
   * desktop navigation is URL-driven and outside this component's control.
   */
  isDetailEditing?: boolean;
  /**
   * Width of the list panel on desktop as a CSS string, e.g. '150px', '12rem'.
   * Default: '150px'.
   */
  listWidth?: string;
  /**
   * Height of the desktop layout container.
   * Default: 'clamp(480px, calc(100vh - 190px), 900px)'.
   */
  layoutHeight?: string;
  /** Label for the mobile back button. Default: 'Back'. */
  backLabel?: string;
  /**
   * Controlled mobile-detail visibility.
   * When provided, the parent owns the state (e.g. to open detail automatically
   * after adding a new item). When omitted, the component manages its own state.
   */
  mobileShowDetail?: boolean;
  onMobileShowDetailChange?: (show: boolean) => void;
}

/**
 * Responsive master-detail shell
 *
 * Desktop : side-by-side  [list | detail]
 * Mobile  : full-width list → select row → full-width detail + back button
 */
const MasterDetailLayout: React.FC<MasterDetailLayoutProps> = ({
  listPanel,
  detailPanel,
  isDetailEditing = false,
  listWidth = '150px',
  layoutHeight = 'clamp(480px, calc(100vh - 190px), 900px)',
  backLabel = 'Back',
  mobileShowDetail: controlledShow,
  onMobileShowDetailChange,
}) => {
  // Support both controlled and uncontrolled mobile-detail visibility.
  const [internalShow, setInternalShow] = useState(false);
  const isControlled = controlledShow !== undefined;
  const mobileShowDetail = isControlled ? controlledShow : internalShow;

  const setMobileShowDetail = (next: boolean) => {
    if (isControlled) {
      onMobileShowDetailChange?.(next);
    } else {
      setInternalShow(next);
    }
  };

  const [pendingBack, setPendingBack] = useState(false);

  const handleBackClick = () => {
    if (isDetailEditing) {
      setPendingBack(true);
    } else {
      setMobileShowDetail(false);
    }
  };

  return (
    <>
      {/* ── Desktop ────────────────────────────────────────────────────────── */}
      <Group
        align="stretch"
        gap={0}
        wrap="nowrap"
        visibleFrom="sm"
        style={{ height: layoutHeight, overflow: 'hidden' }}
      >
        <Box style={{ width: listWidth, flexShrink: 0 }}>
          {listPanel}
        </Box>
        <ScrollArea style={{ flex: 1, height: '100%' }} offsetScrollbars>
          <Box pl="md">{detailPanel}</Box>
        </ScrollArea>
      </Group>

      {/* ── Mobile ─────────────────────────────────────────────────────────── */}
      {/*
       * Note: we intentionally do NOT wrap listPanel in an onClick handler here.
       * Mobile detail navigation is driven by individual row onSelect callbacks
       * calling onMobileShowDetailChange(true) on the parent, which passes it
       * back as the controlled mobileShowDetail prop.
       */}
      <Stack gap="sm" hiddenFrom="sm">
        {!mobileShowDetail ? (
          listPanel
        ) : (
          <Stack gap="md">
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={14} />}
              onClick={handleBackClick}
              style={{ alignSelf: 'flex-start' }}
            >
              {backLabel}
            </Button>
            {detailPanel}
          </Stack>
        )}
      </Stack>

      {/* ── Mobile unsaved-changes guard ───────────────────────────────────── */}
      <UnsavedChangesModal
        opened={pendingBack}
        message="You have an unsaved rule edit. Going back will discard it."
        discardLabel="Discard & Go back"
        onStay={() => setPendingBack(false)}
        onDiscard={() => {
          setPendingBack(false);
          setMobileShowDetail(false);
        }}
      />
    </>
  );
};

export default MasterDetailLayout;