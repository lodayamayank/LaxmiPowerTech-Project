// import React, { useRef, useEffect } from "react";
import React from "react";
import { ROUTES } from '@/lib/routes';
// import { FileUp, ShoppingCart, Upload } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AddIndentPopup({ onClose }) {
  // const popupRef = useRef(null);
  const navigate = useNavigate();

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (popupRef.current && !popupRef.current.contains(event.target)) {
  //       onClose();
  //     }
  //   };
  //   document.addEventListener("mousedown", handleClickOutside);
  //   return () => document.removeEventListener("mousedown", handleClickOutside);
  // }, [onClose]);

  const handleCreateIntent = () => {
    onClose(); // close popup
    navigate(ROUTES.material.intentNew); // go to create intent (PO) page
  };

  const handleUploadIntentList = () => {
    onClose(); // close popup
    navigate(ROUTES.material.uploadPhoto); // go to upload photo page
  };

  return (
  <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
    <SheetContent
      side="bottom"
      className="w-full max-w-md mx-auto rounded-t-[20px] px-6 pb-6"
    >
      <SheetHeader className="mb-6">
        <SheetTitle className="text-left text-lg font-bold text-ink-1">
          Create New Intent
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCreateIntent}
          className="h-auto justify-start gap-4 rounded-xl bg-tone-highlight-soft p-4 text-left  "
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary-strong shadow-md">
            <ShoppingCart size={22} className="text-primary-foreground" />
          </div>

          <div className="flex-1">
            <p className="font-bold text-ink-1">
              Create Intent (PO)
            </p>

            <p className="mt-0.5 text-xs text-ink-3">
              Fill form to create new intent
            </p>
          </div>
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={handleUploadIntentList}
          className="h-auto justify-start gap-4 rounded-xl bg-tone-info-soft p-4 text-left  "
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary-strong shadow-md">
            <Upload size={22} className="text-primary-foreground" />
          </div>

          <div className="flex-1">
            <p className="font-bold text-ink-1">
              Upload Intent List
            </p>

            <p className="mt-0.5 text-xs text-ink-3">
              Upload photo of material list
            </p>
          </div>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-auto p-4"
        >
          Cancel
        </Button>
      </div>
    </SheetContent>
  </Sheet>
);
}
