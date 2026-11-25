import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * White pill "Back" button for the orange mobile header.
 * Colours come from the .mobile-back-button rule in index.css.
 * - floating: absolutely positioned top-left of the header (default).
 *   Pass floating={false} for pages that place it inline.
 */
const MobileBackButton = ({
  onClick,
  label = "Back",
  floating = true,
  className,
}) => (
  <Button
    variant="ghost"
    type="button"
    onClick={onClick}
    className={cn(
      "mobile-back-button",
      floating && "absolute top-6 left-6",
      className,
    )}
  >
    <ArrowLeft size={16} />
    <span className="text-sm font-medium">{label}</span>
  </Button>
);

export default MobileBackButton;
