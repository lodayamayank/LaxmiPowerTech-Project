// Shared tone -> class maps for the common components. Literal strings so Tailwind can see them.
// Tokens only (Step 1 tones + existing primary-soft for "brand").

/** Soft background + foreground text for each tone (tiles, avatars). */
export const TONE_SOFT = {
  neutral: "bg-tone-neutral-soft text-tone-neutral-fg",
  ok: "bg-tone-ok-soft text-tone-ok-fg",
  warn: "bg-tone-warn-soft text-tone-warn-fg",
  bad: "bg-tone-bad-soft text-tone-bad-fg",
  info: "bg-tone-info-soft text-tone-info-fg",
  highlight: "bg-tone-highlight-soft text-tone-highlight-fg",
  purple: "bg-tone-purple-soft text-tone-purple-fg",
  pink: "bg-tone-pink-soft text-tone-pink-fg",
  brand: "bg-primary-soft text-primary-soft-foreground",
};
