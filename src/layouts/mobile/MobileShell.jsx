import { cn } from "@/lib/utils";

/**
 * Phone-width page frame for the employee/supervisor mobile screens.
 * - centered: vertically centres the frame on desktop (a few pages use this).
 * - className / frameClassName: escape hatches for the outer wrapper / the frame.
 *
 * The outer background is a light-only decorative gradient, so it keeps
 * literal light colours on purpose.
 */
const MobileShell = ({ children, centered = false, className, frameClassName }) => (
  <div
    className={cn(
      "min-h-screen bg-tone-highlight-soft",
      centered && "flex items-center justify-center",
      className
    )}
  >
    <div
      className={cn(
        "max-w-md mx-auto min-h-screen bg-surface shadow-xl",
        frameClassName
      )}
    >
      {children}
    </div>
  </div>
);

export default MobileShell;