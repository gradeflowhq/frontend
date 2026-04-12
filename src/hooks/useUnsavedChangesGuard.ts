import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useBlocker } from 'react-router';

/**
 * Props a child section receives from a guarded parent page.
 * Use with {@link useGuardRegistration} to wire up editing-state reporting.
 */
export interface GuardedSectionProps {
  /** Wraps an action with an unsaved-changes check. */
  guard: (action: () => void) => void;
  /** Report editing state to parent for the page-level guard. */
  onEditStateChange: (editing: boolean) => void;
  /** Register a function the parent calls to reset this section's editing state. */
  registerResetEditing: (fn: (() => void) | null) => void;
}

/**
 * Unified unsaved-changes guard that handles every navigation trigger:
 *
 * 1. **Route-level** — `useBlocker` blocks React-Router navigations
 *    (leaving the page) while editing.
 * 2. **In-page** — `guard(action)` intercepts selection changes, tab switches,
 *    add-rule clicks, etc. and defers the action until the user confirms.
 * 3. **Browser-level** — `beforeunload` fires on tab close / refresh.
 *
 * All three funnel into a single modal opened via `modalOpened`, with
 * `handleStay` / `handleDiscard` callbacks.
 *
 * **Important**: this hook should be placed in a component that does NOT
 * unmount during guarded navigations (e.g. the top-level page component).
 * Child sections should receive `guard` via props for within-page navigation.
 */

interface UseUnsavedChangesGuardResult {
  /**
   * Wraps an action with an unsaved-changes check.
   * If not editing, executes immediately. Otherwise, parks the action and
   * opens the modal.
   */
  guard: (action: () => void) => void;
  /** Whether the unsaved-changes modal should be displayed. */
  modalOpened: boolean;
  /** User chose to stay — cancel pending navigation/action. */
  handleStay: () => void;
  /** User chose to discard — clear editing state and proceed. */
  handleDiscard: () => void;
}

export function useUnsavedChangesGuard(
  isEditing: boolean,
  resetEditing: () => void,
): UseUnsavedChangesGuardResult {
  // Route-level guard (leaving the page entirely)
  const blocker = useBlocker(isEditing);

  // Parked in-page action (e.g. "select a different rule", "switch tab")
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Browser-level guard (tab close / refresh)
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isEditing]);

  const guard = useCallback(
    (action: () => void) => {
      if (!isEditing) {
        action();
        return;
      }
      setPendingAction(() => action);
    },
    [isEditing],
  );

  const modalOpened = blocker.state === 'blocked' || pendingAction !== null;

  const handleStay = useCallback(() => {
    if (blocker.state === 'blocked') blocker.reset?.();
    setPendingAction(null);
  }, [blocker]);

  const handleDiscard = useCallback(() => {
    // Flush editing state synchronously so that useBlocker sees
    // isEditing=false before any navigation fires.
    flushSync(() => resetEditing());

    if (blocker.state === 'blocked') {
      blocker.proceed?.();
    }
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [blocker, pendingAction, resetEditing]);

  return { guard, modalOpened, handleStay, handleDiscard };
}

/**
 * Child-side companion to {@link useUnsavedChangesGuard}.
 *
 * Reports `isEditing` to the parent and registers `resetFn` so the parent's
 * discard action can clear this section's editing state.
 *
 * @param resetFn Stable callback (wrap in `useCallback`) that resets local editing state.
 */
export function useGuardRegistration(
  isEditing: boolean,
  onEditStateChange: (editing: boolean) => void,
  registerResetEditing: (fn: (() => void) | null) => void,
  resetFn: () => void,
): void {
  useEffect(() => {
    onEditStateChange(isEditing);
  }, [isEditing, onEditStateChange]);

  useEffect(() => {
    registerResetEditing(resetFn);
    return () => registerResetEditing(null);
  }, [registerResetEditing, resetFn]);
}
