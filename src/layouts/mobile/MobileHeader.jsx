import { cn } from "@/lib/utils";

/**
 * Orange gradient header with rounded bottom used at the top of mobile screens.
 * - sticky: pins the header while the page scrolls (a couple of pages need it).
 */
const MobileHeader = ({ children, sticky = false, className }) => (
  <div
    className={cn(
      "bg-gradient-to-r from-primary to-primary-strong px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative",
      sticky && "sticky top-0 z-10",
      className,
    )}
  >
    {children}
  </div>
);

export default MobileHeader;
