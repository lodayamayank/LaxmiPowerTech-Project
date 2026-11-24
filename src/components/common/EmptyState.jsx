import React from "react";
import { cn } from "@/lib/utils";

/**
 * EmptyState: centered "nothing here" block.
 *
 * Props:
 * - icon {React.ComponentType}: icon shown in a 48px tile
 * - title {node}, description {node}
 * - action {node}: e.g. a Button
 * - className {string}
 * - ...props spread onto the root div
 */
export const EmptyState = ({ icon: Icon, title, description, action, className, ...props }) => (
  <div
    className={cn("flex flex-col items-center justify-center gap-2.5 px-5 py-14 text-center", className)}
    {...props}
  >
    {Icon ? (
      <div className="flex h-12 w-12 items-center justify-center rounded-card bg-surface-muted text-ink-3">
        <Icon size={22} aria-hidden="true" />
      </div>
    ) : null}
    {title ? <div className="text-[15px] font-semibold text-ink-1">{title}</div> : null}
    {description ? <p className="max-w-sm text-body text-ink-3">{description}</p> : null}
    {action ? <div className="mt-1">{action}</div> : null}
  </div>
);

export default EmptyState;
