import React from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * ConfirmDialog: controlled confirmation dialog (wraps ui/alert-dialog).
 * The dialog does not close itself on confirm: the parent decides (e.g. after an async action).
 *
 * Props:
 * - open {boolean}, onOpenChange {(open:boolean)=>void}
 * - title {node}, description {node}
 * - confirmLabel {string} default "Confirm", cancelLabel {string} default "Cancel"
 * - tone {"default"|"destructive"}: confirm button style
 * - loading {boolean}: disables both buttons and shows a spinner on confirm
 * - onConfirm {()=>void}
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
        <Button
          variant={tone === "destructive" ? "destructive" : "default"}
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmDialog;
