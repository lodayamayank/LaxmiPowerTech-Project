import React from "react";
import defaultLogo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

/**
 * Logo: the Laxmi Powertech logo, readable in light and dark mode.
 *
 * The logo is dark-on-transparent, so on a dark theme surface it sits on a small white tile (`.logo-plate`, see
 * index.css). The tile's padding is always reserved, only its background appears in dark mode, so the layout
 * never shifts between themes.
 *
 * Props:
 * - width, height {number}: displayed size (written to the img attributes)
 * - className {string}: applied to the <img>
 * - alt {string} default "Laxmi Powertech"
 * - plate {boolean} default true: use the dark-mode tile. Pass false where the logo already sits on its own
 *   fixed-colour background (a tile you control, a brand-coloured header).
 * - priority {boolean}: true = loading="eager"; otherwise loading="lazy" decoding="async"
 * - srcDark {string}: optional light-coloured logo for dark mode. When given it replaces the tile
 *   (two images toggled with dark:hidden / hidden dark:block).
 * - src {string}: defaults to src/assets/logo.png
 */
export const Logo = ({ width, height, className, alt = "Laxmi Powertech", plate = true, priority = false, srcDark, src = defaultLogo }) => {
  const loading = priority ? { loading: "eager" } : { loading: "lazy", decoding: "async" };
  const img = (extra, source) => <img width={width} height={height} src={source} alt={alt} className={cn(className, extra)} {...loading} />;

  if (srcDark) {
    return (
      <>
        {img("dark:hidden", src)}
        {img("hidden dark:block", srcDark)}
      </>
    );
  }
  if (!plate) return img(undefined, src);
  return <span className="logo-plate inline-flex max-w-full shrink-0 rounded-control px-2 py-1">{img(undefined, src)}</span>;
};

export default Logo;
