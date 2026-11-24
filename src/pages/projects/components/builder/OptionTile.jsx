// src/pages/projects/components/builder/OptionTile.jsx
// Selectable tile (preset / option picker) built on the shared Button.
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OptionTile({ selected, className, children, ...props }) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      className={cn(
        "h-auto flex-col items-start justify-start gap-0.5 whitespace-normal px-3 py-2 text-left",
        selected ? "border-primary bg-tone-info-soft text-ink-1 ring-1 ring-primary" : "text-ink-2",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
