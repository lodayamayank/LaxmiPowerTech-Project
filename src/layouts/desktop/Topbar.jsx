// src/layouts/desktop/Topbar.jsx
// Top bar: sidebar triggers + page title on the left; date, dark mode, notifications and
// account on the right. Receives primitives only, so it re-renders only when they change.
import { memo } from 'react';
import { Calendar, Menu, Moon, PanelLeft, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import NotificationsPopover from './NotificationsPopover';
import AccountMenu from './AccountMenu';

function Topbar({ title, today, darkMode, onToggleDarkMode, userName, userRole, onLogout }) {
  const { state, toggleSidebar } = useSidebar();
  return (
    <header className="z-10 flex flex-wrap items-center gap-3 border-b border-line-card bg-surface px-4 py-3 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {/* Below lg the sidebar opens as a sheet; from lg it collapses to icons. */}
        <Button variant="ghost" size="icon" className="text-ink-3 lg:hidden" onClick={toggleSidebar} aria-label="Open sidebar">
          <Menu size={20} strokeWidth={1.8} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden text-ink-3 lg:inline-flex"
          onClick={toggleSidebar}
          title={state === 'collapsed' ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft size={18} strokeWidth={1.8} />
        </Button>
        {title && <h1 className="truncate text-card-title text-ink-1">{title}</h1>}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Badge variant="neutral" className="hidden h-8 gap-1.5 px-3 sm:inline-flex">
          <Calendar size={15} /> {today}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="text-ink-3"
          onClick={onToggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </Button>
        <NotificationsPopover />
        <span className="mx-1 hidden h-7 w-px bg-line-card sm:block" aria-hidden="true" />
        <AccountMenu name={userName} role={userRole} onLogout={onLogout} />
      </div>
    </header>
  );
}

export default memo(Topbar);
