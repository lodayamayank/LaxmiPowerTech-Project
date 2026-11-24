import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge does not know the design's custom font sizes (text-body, text-small, ...) and would
// treat them as text *colors*, dropping them whenever a real text color is also present
// (e.g. "text-body ... text-ink-2"). Declare them as font sizes.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["caption", "caption-lg", "small", "body", "card-title", "page-title", "kpi"] },
      ],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
