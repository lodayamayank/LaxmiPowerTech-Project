import React from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";
import { TONE_SOFT } from "./tones";

const SIZES = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" };

/**
 * UserAvatar: circle with the user's initials.
 *
 * Props:
 * - name {string}: initials come from getInitials(name)
 * - tone {string} default "brand": any IconTile tone
 * - size {"sm"|"md"|"lg"} default "md" (28 / 32 / 40px)
 * - className {string}
 * - ...props spread onto the root span
 */
export const UserAvatar = ({ name, tone = "brand", size = "md", className, ...props }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center justify-center rounded-full text-caption font-semibold",
      SIZES[size] || SIZES.md,
      TONE_SOFT[tone] || TONE_SOFT.brand,
      className
    )}
    title={name}
    {...props}
  >
    {getInitials(name)}
  </span>
);

export default UserAvatar;
