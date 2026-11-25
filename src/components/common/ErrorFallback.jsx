import React from "react";
import { Home, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";
import { reloadApp } from "@/lib/recovery";

/**
 * ErrorFallback: what the user sees when part of the app failed to render or load.
 * No technical details are shown (only a short reference the user can quote to support).
 *
 * Props:
 * - variant {"page"|"section"}: "page" fills the screen (with the logo); "section" fits inside the page content
 * - kind {"chunk"|"render"}: "chunk" = the screen's code could not be downloaded (update or weak connection)
 * - errorId {string}: reference shown at the bottom
 * - retryCount {number}: how many times "Try again" already failed (after 2 the reload button is emphasised)
 * - onRetry {() => void}: re-render / re-load the failed part
 * - showHome {boolean} default true
 */
export const ErrorFallback = ({ variant = "page", kind = "render", errorId, retryCount = 0, onRetry, showHome = true, className }) => {
  const page = variant === "page";
  const stuck = retryCount >= 2;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-5 text-center",
        page ? "min-h-screen gap-6 bg-page py-10" : "gap-4 rounded-card border border-line-card bg-surface py-12",
        className
      )}
    >
      {page ? <Logo width={150} height={50} priority className="h-auto w-[150px]" /> : null}
      <div className={cn("flex w-full max-w-md flex-col items-center gap-3", page && "rounded-card border border-line-card bg-surface p-8")}>
        <div className="flex size-12 items-center justify-center rounded-card bg-tone-bad-soft text-tone-bad-fg">
          <TriangleAlert size={24} aria-hidden="true" />
        </div>
        <h1 className="text-[18px] font-semibold text-ink-1">Something went wrong</h1>
        <p className="text-body text-ink-3">
          {kind === "chunk"
            ? "This page couldn’t be loaded. It can happen after an update or on a weak connection."
            : "This page couldn’t be displayed properly. Your data has not been changed."}
          {stuck ? " Trying again didn’t help, so please reload the application." : onRetry ? " You can try again." : ""}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <Button type="button" variant={stuck ? "outline" : "default"} onClick={onRetry}>
              <RotateCcw /> Try again
            </Button>
          ) : null}
          <Button type="button" variant={stuck || !onRetry ? "default" : "outline"} onClick={() => reloadApp()}>
            <RefreshCw /> Reload application
          </Button>
          {showHome ? (
            <Button type="button" variant="ghost" onClick={() => window.location.assign(ROUTES.dashboard)}>
              <Home /> Go to home
            </Button>
          ) : null}
        </div>
        {errorId ? <p className="mt-2 text-caption text-ink-4">Reference: {errorId}</p> : null}
      </div>
    </div>
  );
};

export default ErrorFallback;
