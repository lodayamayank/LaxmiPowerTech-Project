// A promise-based replacement for window.confirm that renders the app's ConfirmDialog.
//   const [confirm, confirmDialog] = useConfirm();
//   if (!(await confirm("Delete this?", { title: "Delete", confirmLabel: "Delete", destructive: true }))) return;
//   ...render {confirmDialog} once in the component's JSX.
import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export default function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (description, options = {}) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState({ description, ...options });
      }),
    []
  );

  const settle = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  const dialog = (
    <ConfirmDialog
      open={Boolean(state)}
      onOpenChange={(open) => !open && settle(false)}
      title={state?.title || "Are you sure?"}
      description={state?.description}
      confirmLabel={state?.confirmLabel || "Confirm"}
      tone={state?.destructive ? "destructive" : "default"}
      onConfirm={() => settle(true)}
    />
  );

  return [confirm, dialog];
}
