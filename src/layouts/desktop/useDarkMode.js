// src/layouts/desktop/useDarkMode.js
// Props for the desktop dark-mode toggle. The theme itself (class on <html>, localStorage under
// STORAGE_KEYS.darkMode, startup, other tabs) is owned by lib/theme.js through hooks/useDarkTheme.js.
import useDarkTheme from '@/hooks/useDarkTheme';

export default function useDarkMode() {
  const { dark, toggle } = useDarkTheme();
  return { darkMode: dark, toggleDarkMode: toggle };
}
