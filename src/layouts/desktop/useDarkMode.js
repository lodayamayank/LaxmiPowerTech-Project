// src/layouts/desktop/useDarkMode.js
// Dark mode on/off. Stored in localStorage under STORAGE_KEYS.darkMode ("true" / "false")
// and applied as the `dark` class on <html>, exactly as before.
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export default function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.darkMode) === 'true';
    setDarkMode(saved);
    if (saved) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.darkMode, next.toString());
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  return { darkMode, toggleDarkMode };
}
