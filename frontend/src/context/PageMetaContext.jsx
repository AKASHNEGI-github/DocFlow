import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PageMetaContext = createContext(null);

/**
 * Wraps the authenticated layout (see AppLayout.jsx) so any page rendered
 * inside it can report a count, and the layout's title bar can read it
 * back out - two different components, several levels apart in the tree,
 * agreeing on one piece of state without prop-drilling it through the
 * router.
 */
export function PageMetaProvider({ children }) {
  const [count, setCount] = useState(null);
  const value = useMemo(() => ({ count, setCount }), [count]);
  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>;
}

/**
 * Called by AppLayout only, to read whatever the current page last set.
 */
export function usePageMeta() {
  const ctx = useContext(PageMetaContext);
  if (!ctx) throw new Error('usePageMeta must be used within a PageMetaProvider');
  return ctx;
}

/**
 * Called by an individual page (Dashboard, Draft, Users, ...) to publish
 * its own count - typically the number of rows currently visible after
 * search/filtering, so the badge answers "how many things are in THIS
 * list right now" rather than a total that never matches what's on
 * screen. Pass `null` (or omit) while data is still loading, so the
 * badge doesn't flash a stale "0" before the real count is known.
 *
 * Resets to null on unmount so a count from the page you just navigated
 * away from can never linger into the next one, even for an instant.
 */
export function usePageCount(count = null) {
  const { setCount } = usePageMeta();
  useEffect(() => {
    setCount(count);
    return () => setCount(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
}
