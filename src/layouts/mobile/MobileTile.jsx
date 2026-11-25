// src/layouts/mobile/MobileTile.jsx
// Home-screen shortcut tile (design ".tile"): icon tile, bold title, small subtitle. Renders a link when `to` is given,
// otherwise a button.
import { Link } from "react-router-dom";
import { IconTile } from "@/components/common/IconTile";
import { cn } from "@/lib/utils";

const CLASSES = "flex min-h-24 flex-col gap-2.5 rounded-[14px] border border-line-card bg-surface p-3.5 text-left text-ink-1 transition-colors hover:bg-surface-subtle";

export default function MobileTile({ icon, tone = "brand", title, subtitle, to, onClick, className }) {
  const content = (
    <>
      <IconTile icon={icon} tone={tone} />
      <span>
        <b className="block text-[14.5px] font-semibold">{title}</b>
        {subtitle ? <small className="text-[12.5px] text-ink-3">{subtitle}</small> : null}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className={cn(CLASSES, className)}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cn(CLASSES, className)}>
      {content}
    </button>
  );
}
