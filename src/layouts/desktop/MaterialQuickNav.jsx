// src/layouts/desktop/MaterialQuickNav.jsx
// Underline-tab bar shown on /dashboard/material/* pages (links, not buttons).
import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const LINKS = [
  { label: 'Indent lists', to: ROUTES.adminMaterial.uploadIndent },
  { label: 'Purchase orders', to: ROUTES.adminMaterial.intent },
  { label: 'Site transfers', to: ROUTES.adminMaterial.siteTransfers },
  { label: 'Deliveries', to: ROUTES.adminMaterial.upcomingDeliveries },
  { label: 'GRN', to: ROUTES.adminMaterial.grn },
];

function MaterialQuickNav() {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/dashboard/material/')) return null;
  return (
    <nav aria-label="Material" className="flex gap-1 overflow-x-auto border-b border-line-card bg-surface px-4 md:px-8">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              '-mb-px inline-flex h-control-tab shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-body font-medium transition-colors',
              isActive ? 'border-primary font-semibold text-primary' : 'border-transparent text-ink-3 hover:text-ink-1',
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default memo(MaterialQuickNav);
