
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="top-right"
      closeButton
      richColors
      duration={4000}
      icons={{
        success: <CircleCheck className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        warning: <TriangleAlert className="h-5 w-5" />,
        error: <OctagonX className="h-5 w-5" />,
        loading: <LoaderCircle className="h-5 w-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-border bg-background text-foreground shadow-lg",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
          actionButton:
            "rounded-md bg-primary px-3 py-1.5 text-primary-foreground",
          cancelButton:
            "rounded-md bg-muted px-3 py-1.5 text-muted-foreground",
          closeButton:
            "border border-border bg-background text-muted-foreground hover:bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

