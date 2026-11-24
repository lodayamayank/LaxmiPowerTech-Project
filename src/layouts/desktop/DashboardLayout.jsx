// src/layouts/desktop/DashboardLayout.jsx
// Desktop shell: sidebar + top bar + (material quick nav) + page content.
// Props: title (shown in the top bar), children. Content is full width (no max-width).
import { useCallback, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ROUTES } from '@/lib/routes';
import { clearSession, getUser } from '@/lib/session';
import { formatToday } from '@/lib/format';
import AppSidebar from './AppSidebar';
import Topbar from './Topbar';
import MaterialQuickNav from './MaterialQuickNav';
import useDarkMode from './useDarkMode';
import usePendingCounts from './usePendingCounts';
import useSidebarMenus from './useSidebarMenus';

const DashboardLayout = ({ children, title }) => {
  const navigate = useNavigate();
  // Read once per layout mount; the stored user does not change while a page is open.
  const [user] = useState(getUser);
  const role = user?.role;
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { leaves, reimbursements } = usePendingCounts(role);
  const { openMenus, toggleMenu } = useSidebarMenus();

  const handleLogout = useCallback(() => {
    clearSession();
    navigate(ROUTES.login, { replace: true });
  }, [navigate]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-screen overflow-hidden bg-page">
        <AppSidebar
          role={role}
          pendingLeaveCount={leaves}
          pendingReimbursementCount={reimbursements}
          openMenus={openMenus}
          onToggleMenu={toggleMenu}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            title={title}
            today={formatToday()}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            userName={user?.name}
            userRole={role}
            onLogout={handleLogout}
          />
          <MaterialQuickNav />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-page">
            <div className="flex w-full min-w-0 flex-col gap-4 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
