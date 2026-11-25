// src/layouts/mobile/MobilePage.jsx
// Page frame of the mobile app, as in the mobile designs: a top bar (logo + avatar on home screens, back button +
// title on inner screens), a scrolling body with 16 px padding and 14 px gaps, and an optional bottom tab bar.
// The frame is the full viewport on a phone and a centered 448 px column on a larger screen.
//
//   <MobilePage title="My attendance" tabs="worker">...</MobilePage>          inner screen with the tab bar
//   <MobilePage title="New claim" back>...</MobilePage>                       sub-flow (back button, no tab bar)
//   <MobilePage home right={<UserAvatar .../>} tabs="worker">...</MobilePage> home screen (logo in the top bar)
import { ArrowLeft, Moon, Sun } from "lucide-react";
import useDarkTheme from "@/hooks/useDarkTheme";
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";
import MobileTabBar from "./MobileTabBar";

export function MobileTopBar({ title, home = false, back = false, onBack, right }) {
  const navigate = useNavigate();
  const { dark, toggle } = useDarkTheme();
  return (
    <header className="sticky top-0 z-20 flex min-h-[60px] items-center gap-3 border-b border-line bg-surface px-4 py-3.5">
      {back ? (
        <Button variant="ghost" size="icon" aria-label="Back" className="-ml-2 !size-11 text-primary" onClick={onBack || (() => navigate(-1))}>
          <ArrowLeft className="!size-5" />
        </Button>
      ) : null}
      {home ? <Logo width={74} height={26} priority className="h-[26px] w-auto" /> : <h1 className="min-w-0 flex-1 truncate text-[18px] font-semibold text-primary">{title}</h1>}
      {home ? <span className="flex-1" /> : null}
      {/* Light / dark switch, on the home screens (it is also a row on the Profile screen). */}
      {home ? (
        <Button variant="ghost" size="icon" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="!size-11 text-ink-2" onClick={toggle}>
          {dark ? <Sun className="!size-5" /> : <Moon className="!size-5" />}
        </Button>
      ) : null}
      {right}
    </header>
  );
}

/**
 * Props:
 * - title {string}: top bar title (inner screens)
 * - home {boolean}: show the logo instead of a title
 * - back {boolean}: show the back button (history back, or `onBack`)
 * - right {node}: right side of the top bar (avatar, icon button)
 * - tabs {"worker"|"manager"|null}: bottom tab bar variant (labour/staff, or supervisor/subcontractor)
 * - footer {node}: sticky bar above the tab bar / bottom (primary action of a form)
 * - className {string}: body classes
 */
export default function MobilePage({ title, home = false, back = false, onBack, right, tabs = null, footer, className, children }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-[100dvh] bg-page">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-page md:border-x md:border-line">
        <MobileTopBar title={title} home={home} back={back} onBack={onBack} right={right} />
        <main className={cn("flex flex-1 flex-col gap-3.5 p-4", className)}>
          {/* A failing screen body keeps the top bar and tab bar; leaving the screen clears the error. */}
          <ErrorBoundary scope="mobile-content" resetKeys={[pathname]}>
            {children}
          </ErrorBoundary>
        </main>
        {footer || tabs ? (
          <div className="sticky bottom-0 z-20">
            {footer ? <div className="border-t border-line bg-surface p-3">{footer}</div> : null}
            {tabs ? <MobileTabBar variant={tabs} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
