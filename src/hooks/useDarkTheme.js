// src/hooks/useDarkTheme.js
// React view of the app theme (see lib/theme.js, the single owner). Re-renders when the theme changes, whoever
// changed it (toggle, another tab). Use this wherever a component needs to know the theme in JS (charts, toaster).
import { useSyncExternalStore } from 'react';
import { isDarkMode, subscribeTheme, setDarkMode, toggleDarkMode } from '@/lib/theme';

export default function useDarkTheme() {
  const dark = useSyncExternalStore(subscribeTheme, isDarkMode, () => false);
  return { dark, setDark: setDarkMode, toggle: toggleDarkMode };
}
