import React from "react";
import { cn } from "@/lib/utils";
import { TONE_SOFT } from "./tones";

/**
 * IconTile: 32px rounded tile holding an icon.
 *
 * Props:
 * - icon {React.ComponentType}: icon component (lucide-react preferred)
 * - tone {"neutral"|"ok"|"warn"|"bad"|"info"|"highlight"|"purple"|"pink"|"brand"} default "neutral"
 * - className {string}
 * - ...props spread onto the root div
 */
export const IconTile = ({ icon: Icon, tone = "neutral", className, ...props }) => (
  <div
    className={cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-control",
      TONE_SOFT[tone] || TONE_SOFT.neutral,
      className
    )}
    {...props}
  >
    {Icon ? <Icon size={16} aria-hidden="true" /> : null}
  </div>
);

export default IconTile;
