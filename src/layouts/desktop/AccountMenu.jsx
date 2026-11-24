// src/layouts/desktop/AccountMenu.jsx
// Account button in the top bar. The old sidebar user card only displayed the name and role,
// and the old footer offered Logout (plus a disabled Settings placeholder), so the menu
// shows the name and role and offers Logout.
import { ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/common/UserAvatar';

export default function AccountMenu({ name, role, onLogout }) {
  const displayName = name || 'User';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-2 px-1.5 py-1" aria-label="Account menu">
          <UserAvatar name={displayName} size="sm" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[13.5px] font-semibold text-ink-1">{displayName}</span>
            <span className="block text-caption font-medium capitalize text-ink-3">{role || 'Supervisor'}</span>
          </span>
          <ChevronDown size={16} className="text-ink-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-small font-semibold text-ink-1">{displayName}</span>
          <span className="block text-caption capitalize text-ink-3">{role || 'Supervisor'}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="gap-2 text-small">
          <LogOut size={16} /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
