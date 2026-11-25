// src/layouts/mobile/MobileCard.jsx
// Content card of the mobile app (design ".mc"): white, hairline border, 14 px radius, 16 px padding.
// `title`/`action` add the usual header row (15 px semibold title, optional link/button on the right).
import { cn } from "@/lib/utils";

export default function MobileCard({ title, action, className, children, ...props }) {
  return (
    <section className={cn("rounded-[14px] border border-line-card bg-surface p-4", className)} {...props}>
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 className="text-[15px] font-semibold text-ink-1">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
