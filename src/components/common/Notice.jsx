import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Notice: inline notice box (an Alert with a leading icon and an optional trailing action).
 *
 * Props:
 * - tone {"neutral"|"info"|"ok"|"warn"|"bad"} default "info"
 * - icon {React.ComponentType}: leading lucide icon
 * - title {node}: bold first line (optional)
 * - children {node}: the text
 * - action {node}: trailing Button (optional)
 * - className {string}
 */
export const Notice = ({ tone = "info", icon: Icon, title, children, action, className, ...props }) => (
  <Alert
    variant={tone}
    className={cn(
      "flex items-start gap-3 rounded-card p-3.5 text-small [&>svg]:static [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg~*]:pl-0 [&>svg+div]:translate-y-0",
      className
    )}
    {...props}
  >
    {Icon ? <Icon aria-hidden="true" /> : null}
    <AlertDescription className="min-w-0 flex-1 text-small">
      {title ? <div className="font-semibold">{title}</div> : null}
      <div>{children}</div>
    </AlertDescription>
    {action ? <div className="shrink-0">{action}</div> : null}
  </Alert>
);

export default Notice;
