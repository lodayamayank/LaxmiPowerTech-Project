import React from "react";
import { Logo } from "@/components/common/Logo";
import { cn } from "@/lib/utils";

/**
 * PageLoader: full-screen loading state (route chunks while they download, app start).
 * Brand logo, a spinner and a short message on the page background, all from design tokens so it follows the theme.
 *
 * Props:
 * - label {string} default "Loading": the message shown (and read by screen readers)
 * - className {string}: merged onto the root
 */
export const PageLoader = ({ label = "Loading", className }) => (
  <div role="status" aria-live="polite" className={cn("flex min-h-screen flex-col items-center justify-center gap-6 bg-page px-6", className)}>
    <Logo width={170} height={57} priority className="h-auto w-[170px]" />
    <div className="flex items-center gap-3 text-body text-ink-3">
      <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-line-input border-t-primary" />
      <span>{label}…</span>
    </div>
  </div>
);

export default PageLoader;
