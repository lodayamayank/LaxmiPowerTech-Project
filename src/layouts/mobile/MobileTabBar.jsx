// src/layouts/mobile/MobileTabBar.jsx
// Bottom tab bar of the mobile app (4 tabs). "worker" = labour and staff; "manager" = supervisor and subcontractor.
import { CalendarDays, FileText, FolderKanban, House, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const TABS = {
  worker: [
    { label: "Home", to: ROUTES.dashboard, icon: <House className="size-5" />, end: true },
    { label: "Attendance", to: "/my-attendance", icon: <CalendarDays className="size-5" /> },
    { label: "Requests", to: "/leaves", icon: <FileText className="size-5" /> },
    { label: "Profile", to: ROUTES.profile, icon: <User className="size-5" /> },
  ],
  manager: [
    { label: "Home", to: ROUTES.dashboard, icon: <House className="size-5" />, end: true },
    { label: "Projects", to: "/supervisor/projects", icon: <FolderKanban className="size-5" /> },
    { label: "Requests", to: "/leaves", icon: <FileText className="size-5" /> },
    { label: "Profile", to: ROUTES.profile, icon: <User className="size-5" /> },
  ],
};

export default function MobileTabBar({ variant = "worker" }) {
  return (
    <nav aria-label="App" className="flex border-t border-line-card bg-surface px-1 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
      {TABS[variant].map(({ label, to, icon, end }) => (
        <NavLink
          key={label}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-control text-caption font-medium",
              isActive ? "font-semibold text-primary" : "text-ink-3",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn("flex h-[30px] w-[52px] items-center justify-center rounded-full", isActive && "bg-primary-soft")}>{icon}</span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
