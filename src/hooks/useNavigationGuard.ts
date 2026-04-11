import { useEffect } from 'react';
import { useBlocker } from 'react-router';

/**
 * Blocks both client-side (React Router) and browser-level (tab close /
 * refresh) navigation while `shouldBlock` is true.
 *
 * Returns a `blocker` object whose `state` is either `'blocked'` (user tried
 * to navigate and needs confirmation) or `'unblocked'`. Call
 * `blocker.proceed()` to allow navigation, `blocker.reset()` to cancel.
 */
export const useNavigationGuard = (shouldBlock: boolean) => {
  const blocker = useBlocker(shouldBlock);

  // Browser-level guard (tab close / refresh / address bar navigation)
  useEffect(() => {
    if (!shouldBlock) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldBlock]);

  return blocker;
};
