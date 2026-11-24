import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IconTile } from "./IconTile";

/**
 * StatCard: metric card (icon tile + label, big value, optional sub-line).
 *
 * Props:
 * - label {node}: metric name
 * - value {node}: the figure
 * - sub {node}: small text under the value
 * - icon {React.ComponentType}: icon for the tile
 * - tone {string}: IconTile tone
 * - className {string}
 * - ...props spread onto the root Card
 */
export const StatCard = ({ label, value, sub, icon, tone = "highlight", className, ...props }) => {
  return (
    <Card className={cn("flex flex-col gap-1.5 p-5", className)} {...props}>
      <div className="flex items-center gap-2.5">
        {icon ? <IconTile icon={icon} tone={tone} /> : null}
        <span className="text-small font-medium text-ink-3">{label}</span>
      </div>
      <div className="text-kpi tabular-nums text-ink-1">{value}</div>
      {sub ? <div className="text-caption-lg text-ink-3">{sub}</div> : null}
    </Card>
  );
};

export default StatCard;
