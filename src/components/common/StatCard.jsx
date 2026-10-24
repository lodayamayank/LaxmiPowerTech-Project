import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Color presets mapping color names to Tailwind classes for
 * the value text, icon circle background, and icon color.
 * Supports both light and dark mode.
 */
const COLOR_PRESETS = {
  orange: {
    text: "text-gray-800 dark:text-gray-100",
    bg: "bg-orange-100 dark:bg-orange-950/40",
    icon: "text-orange-600 dark:text-orange-400",
  },
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-950/40",
    icon: "text-blue-600 dark:text-blue-400",
  },
  green: {
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-950/40",
    icon: "text-green-600 dark:text-green-400",
  },
  red: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-950/40",
    icon: "text-red-600 dark:text-red-400",
  },
  purple: {
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-950/40",
    icon: "text-purple-600 dark:text-purple-400",
  },
  yellow: {
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-950/40",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
};

/**
 * StatCard — Reusable metric/stat card with an icon circle.
 *
 * @param {string} title — Label text (e.g. "Total Branches")
 * @param {string|number} value — Displayed metric value
 * @param {React.ComponentType} icon — Icon component (e.g. FaBuilding)
 * @param {string} [color="orange"] — Color preset name
 * @param {string} [className] — Additional Card classes
 */
const StatCard = ({ title, value, icon: Icon, color = "orange", className }) => {
  const preset = COLOR_PRESETS[color] || COLOR_PRESETS.orange;

  return (
    <Card className={cn(className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className={cn("text-3xl font-bold mt-1", preset.text)}>
              {value}
            </p>
          </div>
          {Icon && (
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                preset.bg
              )}
            >
              <Icon className={preset.icon} size={20} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
