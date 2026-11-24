// src/layouts/desktop/useSidebarMenus.js
// Which sidebar accordions are open. The one containing the current page opens on
// navigation; clicking a group header toggles it (one open at a time, as before).
import { useCallback, useEffect, useState } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { NAV_GROUPS } from './navConfig';

export const isRouteActive = (to, pathname) =>
  !!to && !!matchPath({ path: to, end: to === '/dashboard' }, pathname);

const groupWithActiveChild = (pathname) => {
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      if (item.children?.some((c) => isRouteActive(c.to, pathname))) return item.label;
    }
  }
  return null;
};

export default function useSidebarMenus() {
  const { pathname } = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  useEffect(() => {
    const key = groupWithActiveChild(pathname);
    setOpenMenus(key ? { [key]: true } : {});
  }, [pathname]);

  const toggleMenu = useCallback((key) => {
    setOpenMenus((prev) => (prev[key] ? {} : { [key]: true }));
  }, []);

  return { openMenus, toggleMenu };
}
