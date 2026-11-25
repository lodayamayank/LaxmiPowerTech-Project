import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, toast } from "sonner";
import useDarkTheme from "@/hooks/useDarkTheme";
import { useIsMobile } from "@/hooks/use-mobile";

/*
 * Toasts & feedback, as in the design:
 *  - Desktop: bottom-right, newest on top, up to 3 stacked; white card with a tone-coloured icon circle, title,
 *    description and text actions. Success 5 s, info/warning 7 s, error stays until dismissed.
 *  - Mobile (phones, <= 600 px): one at a time, dark pill 12 px above the bottom tab bar, 4 s, swipe to dismiss.
 * Every `toast.*` call in the app goes through here, so only the look and timing change, not the call sites.
 */

// Per-type timing. sonner has no per-type default, so the shared `toast` helpers get them once, here.
const DURATION = { info: 7000, warning: 7000, error: Infinity };
["info", "warning", "error"].forEach((type) => {
  const original = toast[type];
  if (original && !original.__timed) {
    toast[type] = (message, options) => original(message, { duration: DURATION[type], ...options });
    toast[type].__timed = true;
  }
});

const TONES = {
  success: "group-data-[type=success]:bg-tone-ok-soft group-data-[type=success]:text-tone-ok-fg",
  error: "group-data-[type=error]:bg-tone-bad-soft group-data-[type=error]:text-tone-bad-fg",
  warning: "group-data-[type=warning]:bg-tone-warn-soft group-data-[type=warning]:text-tone-warn-fg",
  info: "group-data-[type=info]:bg-tone-info-soft group-data-[type=info]:text-tone-info-fg",
  loading: "group-data-[type=loading]:bg-primary-soft group-data-[type=loading]:text-primary",
};

const iconCircle = (size) =>
  `!m-0 flex ${size} shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-3 ${Object.values(TONES).join(" ")}`;

const Toaster = ({ ...props }) => {
  // Follows the app theme (lib/theme.js), not the OS setting.
  const { dark } = useDarkTheme();
  const phone = useIsMobile(601);

  const desktopClasses = {
    toast:
      "group !items-start !gap-3 !rounded-card !border !border-line-card !bg-surface !p-3.5 !text-ink-1 !shadow-lg",
    icon: iconCircle("!size-8"),
    title: "!text-body !font-semibold !text-ink-1",
    description: "!mt-0.5 !text-small !text-ink-3",
    actionButton: "!h-auto !bg-transparent !px-0.5 !py-1 !text-small !font-semibold !text-primary",
    cancelButton: "!h-auto !bg-transparent !px-0.5 !py-1 !text-small !font-semibold !text-ink-3",
    closeButton: "!border-line-card !bg-surface !text-ink-3 hover:!bg-surface-muted",
  };
  const phoneClasses = {
    toast: "group !items-center !gap-3 !rounded-[14px] !border-0 !bg-ink-1 !px-3.5 !py-3 !text-surface !shadow-lg",
    icon: iconCircle("!size-[30px]"),
    title: "!text-[14.5px] !font-semibold !text-surface",
    description: "!mt-px !text-[13px] !text-surface/70",
    actionButton: "!h-auto !min-h-11 !bg-transparent !px-1 !text-[14px] !font-semibold !text-highlight",
    cancelButton: "!h-auto !min-h-11 !bg-transparent !px-1 !text-[14px] !font-semibold !text-surface/70",
    closeButton: "!hidden",
  };

  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      position={phone ? "bottom-center" : "bottom-right"}
      visibleToasts={phone ? 1 : 3}
      duration={phone ? 4000 : 5000}
      closeButton={!phone}
      mobileOffset={{ bottom: 76, left: 16, right: 16 }}
      style={{ "--width": "400px" }}
      icons={{
        success: <CircleCheck className="size-[18px]" />,
        info: <Info className="size-[18px]" />,
        warning: <TriangleAlert className="size-[18px]" />,
        error: <OctagonX className="size-[18px]" />,
        loading: <LoaderCircle className="size-[18px] animate-spin" />,
      }}
      toastOptions={{ unstyled: false, classNames: phone ? phoneClasses : desktopClasses }}
      {...props}
    />
  );
};

export { Toaster };
