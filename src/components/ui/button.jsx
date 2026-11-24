import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-body font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary border border-primary text-primary-foreground hover:bg-primary-strong",
        destructive:
          "bg-tone-bad-solid border border-tone-bad-solid text-destructive-foreground hover:bg-tone-bad-solid/90",
        outline:
          "border border-line-input bg-surface text-ink-2 hover:bg-surface-subtle",
        secondary: "bg-surface-muted text-ink-2 hover:bg-line",
        ghost:
          "border border-transparent bg-transparent text-ink-2 hover:bg-surface-muted",
        link: "text-primary underline-offset-4 hover:underline",
        approve:
          "bg-tone-ok-soft text-tone-ok-fg border border-tone-ok-border hover:bg-tone-ok-soft/70",
        reject:
          "bg-tone-bad-soft text-tone-bad-fg border border-tone-bad-border hover:bg-tone-bad-soft/70",
      },
      size: {
        default: "h-control px-3.5",
        sm: "h-control-sm px-2.5 text-small",
        lg: "h-11 px-8",
        icon: "h-control w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
