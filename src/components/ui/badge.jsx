import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 h-6 px-[9px] rounded-pill border text-caption font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-surface-muted text-ink-2 hover:bg-line",
        destructive:
          "border-transparent bg-tone-bad-solid text-destructive-foreground hover:bg-tone-bad-solid/90",
        outline: "border-line-input text-ink-2",
        ok: "border-transparent bg-tone-ok-soft text-tone-ok-fg",
        warn: "border-transparent bg-tone-warn-soft text-tone-warn-fg",
        bad: "border-transparent bg-tone-bad-soft text-tone-bad-fg",
        info: "border-transparent bg-tone-info-soft text-tone-info-fg",
        neutral: "border-transparent bg-tone-neutral-soft text-tone-neutral-fg",
        highlight: "border-transparent bg-tone-highlight-soft text-tone-highlight-fg",
        purple: "border-transparent bg-tone-purple-soft text-tone-purple-fg",
        pink: "border-transparent bg-tone-pink-soft text-tone-pink-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  dot = false,
  children,
  ...props
}) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants }
