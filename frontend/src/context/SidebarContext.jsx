import { createContext, useContext, useEffect, useState } from 'react';

const SidebarContext = createContext(null);
const STORAGE_KEY = 'docflow.sidebar-collapsed';

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider.');
  return ctx;
}
