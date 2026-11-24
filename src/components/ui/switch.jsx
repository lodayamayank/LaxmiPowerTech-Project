import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Switch: on/off toggle built on a native button (no extra dependency).
 * Space and Enter toggle it natively. Name it with aria-label or aria-labelledby.
 *
 * Props: checked {boolean}, onCheckedChange {(checked:boolean)=>void}, disabled, className,
 * plus any button prop (id, aria-label, ...).
 */
const Switch = React.forwardRef(
  ({ checked = false, onCheckedChange, disabled, className, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) onCheckedChange?.(!checked)
      }}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border border-line-input bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-surface shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  )
)
Switch.displayName = "Switch"

export { Switch }
