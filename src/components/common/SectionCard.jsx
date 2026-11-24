import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * SectionCard: Card with an optional header (title, description, actions) and a body.
 *
 * Props:
 * - title {node}, description {node}, actions {node}: header content (header hidden if all empty)
 * - flush {boolean}: no body padding (use for tables)
 * - children {node}: body
 * - className {string}: merged onto the Card
 * - bodyClassName {string}: merged onto the body wrapper
 * - ...props spread onto the Card
 */
export const SectionCard = ({
  title,
  description,
  actions,
  flush = false,
  children,
  className,
  bodyClassName,
  ...props
}) => {
  const hasHeader = title || description || actions;
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      {hasHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title ? <div className="text-card-title text-ink-1">{title}</div> : null}
            {description ? <div className="mt-0.5 text-small text-ink-3">{description}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(!flush && "p-5", bodyClassName)}>{children}</div>
    </Card>
  );
};

export default SectionCard;
