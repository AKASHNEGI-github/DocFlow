import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'docflow.theme';

/**
 * Applies a `dark` class to <html> rather than using Tailwind's dark:
 * variant utilities throughout every component. Every color in this app
 * is already a CSS custom property (styles/global.css's @theme block),
 * so light/dark only needs one place to redefine those variables under
 * `:root.dark { ... }` - no component file needs a dark: class added to
 * it individually, and no component needs to know which theme is active
 * at all.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider.');
  return ctx;
}
