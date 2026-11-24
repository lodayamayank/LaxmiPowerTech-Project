import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        ok: "border-tone-ok-border bg-tone-ok-soft text-tone-ok-fg [&>svg]:text-tone-ok-fg",
        bad: "border-tone-bad-border bg-tone-bad-soft text-tone-bad-fg [&>svg]:text-tone-bad-fg",
        warn: "border-tone-warn-fg/30 bg-tone-warn-soft text-tone-warn-fg [&>svg]:text-tone-warn-fg",
        info: "border-tone-info-fg/30 bg-tone-info-soft text-tone-info-fg [&>svg]:text-tone-info-fg",
        neutral: "border-line-card bg-tone-neutral-soft text-tone-neutral-fg [&>svg]:text-tone-neutral-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
