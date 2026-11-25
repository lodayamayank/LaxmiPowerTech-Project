import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Selfie confirmation before a punch is sent: preview of the photo, then Confirm / Cancel.
const ConfirmModal = ({ image, user, punchType, onConfirm, onCancel }) => {
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm gap-4">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle>{user?.name || "User"}</DialogTitle>
          <DialogDescription>
            Punching {punchType} at {time}
          </DialogDescription>
        </DialogHeader>
        <img src={image} alt="Your selfie" className="mx-auto size-40 rounded-full border-4 border-tone-ok-fg object-cover" />
        <div className="flex flex-col gap-2">
          <Button size="xl" className="w-full" onClick={onConfirm}>
            Confirm
          </Button>
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmModal;
