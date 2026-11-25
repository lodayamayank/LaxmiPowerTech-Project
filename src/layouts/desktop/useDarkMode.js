// src/layouts/desktop/useDarkMode.js
// Dark mode on/off. Stored in localStorage under STORAGE_KEYS.darkMode ("true" / "false")
// and applied as the `dark` class on <html>, exactly as before.
import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';
import { DARK_MODE_ENABLED, readDarkPreference } from '@/lib/theme';

export default function useDarkMode() {
  // The class itself is applied once at startup (applyInitialTheme in main.jsx); this hook only keeps the toggle state.
  const [darkMode, setDarkMode] = useState(readDarkPreference);

  const toggleDarkMode = useCallback(() => {
    if (!DARK_MODE_ENABLED) return; // dark mode is switched off app-wide (see lib/theme.js)
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.darkMode, next.toString());
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  return { darkMode, toggleDarkMode };
}
