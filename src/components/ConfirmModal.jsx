import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

const ConfirmModal = ({ image, user, punchType, onConfirm, onCancel }) => {
  const time = new Date().toLocaleTimeString();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">{user?.name || "User"}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            <Avatar className="w-40 h-40 border-4 border-green-600">
              <AvatarImage src={image} alt="selfie" className="object-cover" />
            </Avatar>
          </div>
          <p className="text-sm text-muted-foreground">
            Punching {punchType} at {time}
          </p>
          <div className="space-y-2">
            <Button
              onClick={onConfirm}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Confirm
            </Button>
            <Button
              onClick={onCancel}
              variant="secondary"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmModal;
