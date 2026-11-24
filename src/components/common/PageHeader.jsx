import React from "react";
import { cn } from "@/lib/utils";

/**
 * PageHeader: eyebrow + title + description on the left, actions on the right.
 *
 * Props:
 * - eyebrow {node}: small text above the title
 * - title {node}: rendered as the page h1
 * - description {node}: text under the title
 * - actions {node}: right-aligned area (buttons)
 * - className {string}
 * - ...props spread onto the root element
 */
export const PageHeader = ({ eyebrow, title, description, actions, className, ...props }) => (
  <div className={cn("flex flex-wrap items-end justify-between gap-4", className)} {...props}>
    <div className="min-w-0">
      {eyebrow ? <div className="mb-1.5 text-small text-ink-3">{eyebrow}</div> : null}
      {title ? <h1 className="text-page-title text-primary">{title}</h1> : null}
      {description ? <p className="mt-1 text-body text-ink-3">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export default PageHeader;
