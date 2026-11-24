// import React, { useRef, useEffect } from "react";
import React from "react";
// import { FileUp, ShoppingCart, Upload } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AddIndentPopup({ onClose, onUploadClick }) {
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
    navigate("/material/intent/new"); // go to create intent (PO) page
  };

  const handleUploadIntentList = () => {
    onClose(); // close popup
    navigate("/material/upload-photo"); // go to upload photo page
  };

  return (
  <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
    <SheetContent
      side="bottom"
      className="w-full max-w-md mx-auto rounded-t-3xl px-6 pb-6"
    >
      <SheetHeader className="mb-6">
        <SheetTitle className="text-left text-lg font-bold text-gray-900">
          Create New Intent
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCreateIntent}
          className="h-auto justify-start gap-4 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 p-4 text-left hover:from-orange-100 hover:to-orange-200"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md">
            <ShoppingCart size={22} className="text-white" />
          </div>

          <div className="flex-1">
            <p className="font-bold text-gray-900">
              Create Intent (PO)
            </p>

            <p className="mt-0.5 text-xs text-gray-600">
              Fill form to create new intent
            </p>
          </div>
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={handleUploadIntentList}
          className="h-auto justify-start gap-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 p-4 text-left hover:from-blue-100 hover:to-blue-200"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
            <Upload size={22} className="text-white" />
          </div>

          <div className="flex-1">
            <p className="font-bold text-gray-900">
              Upload Intent List
            </p>

            <p className="mt-0.5 text-xs text-gray-600">
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
