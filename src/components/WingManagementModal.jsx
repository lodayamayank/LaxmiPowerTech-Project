import React, { useState } from "react";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaCheck,
  FaTimes,
  FaCopy,
} from "react-icons/fa";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WingManagementModal = ({ tower, towerIdx, onSave, onClose }) => {
  const [localTower, setLocalTower] = useState(
    JSON.parse(JSON.stringify(tower))
  );
  const [editingWingIdx, setEditingWingIdx] = useState(null);
  const [editWingName, setEditWingName] = useState("");
  const [wingToDelete, setWingToDelete] = useState(null); // index of the wing awaiting delete confirmation

  const addWing = () => {
    const newWing = {
      name: `Wing ${String.fromCharCode(65 + localTower.wings.length)}`,
      floors: [],
    };
    setLocalTower({
      ...localTower,
      wings: [...localTower.wings, newWing],
    });
  };

  const deleteWing = (wingIdx) => {
    if (localTower.wings.length <= 1) {
      toast.error(
        "Cannot delete the last wing. Tower must have at least one wing."
      );
      return;
    }
    setWingToDelete(wingIdx);
  };

  const confirmDeleteWing = () => {
    if (wingToDelete === null) return;
    const newWings = localTower.wings.filter((_, idx) => idx !== wingToDelete);
    setLocalTower({
      ...localTower,
      wings: newWings,
    });
    setWingToDelete(null);
  };

  const copyWing = (wingIdx) => {
    const copiedWing = JSON.parse(JSON.stringify(localTower.wings[wingIdx]));
    copiedWing.name = `${copiedWing.name} (Copy)`;
    setLocalTower({
      ...localTower,
      wings: [...localTower.wings, copiedWing],
    });
  };

  const startEditWing = (wingIdx) => {
    setEditingWingIdx(wingIdx);
    setEditWingName(localTower.wings[wingIdx].name);
  };

  const saveWingName = () => {
    const newWings = [...localTower.wings];
    newWings[editingWingIdx].name = editWingName;
    setLocalTower({
      ...localTower,
      wings: newWings,
    });
    setEditingWingIdx(null);
  };

  const cancelEditWing = () => {
    setEditingWingIdx(null);
    setEditWingName("");
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl [&>button]:text-white [&>button]:opacity-100 [&>button]:top-5 [&>button]:right-5 [&>button:hover]:bg-white/20">
          <DialogHeader className="shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-left space-y-0">
            <DialogTitle className="text-xl font-bold text-white">
              Wing Management
            </DialogTitle>
            <DialogDescription className="text-white/90 text-sm mt-1">
              {tower.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <p className="text-sm text-gray-600">
                Manage wings for this tower. Each wing can have its own floors
                and configuration.
              </p>
              <Button
                type="button"
                onClick={addWing}
                className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <FaPlus /> Add Wing
              </Button>
            </div>

            <div className="space-y-3">
              {localTower.wings.map((wing, wingIdx) => (
                <Card
                  key={wingIdx}
                  className="gap-0 py-0 rounded-lg border-2 border-indigo-200 bg-indigo-50 shadow-none"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      {editingWingIdx === wingIdx ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="text"
                            value={editWingName}
                            onChange={(e) => setEditWingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveWingName();
                              } else if (e.key === "Escape") {
                                // cancel the rename only, don't close the whole dialog
                                e.preventDefault();
                                e.stopPropagation();
                                cancelEditWing();
                              }
                            }}
                            aria-label="Wing name"
                            className="flex-1 h-10 bg-white border-2 border-indigo-500 focus-visible:ring-indigo-500/30"
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="icon"
                            aria-label="Save wing name"
                            onClick={saveWingName}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <FaCheck />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            aria-label="Cancel rename"
                            onClick={cancelEditWing}
                            className="bg-gray-400 hover:bg-gray-500 text-white"
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl">🏢</span>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 truncate">
                                {wing.name}
                              </p>
                              <Badge
                                variant="secondary"
                                className="mt-0.5 bg-white text-gray-600 border border-indigo-200 text-xs font-normal"
                              >
                                {wing.floors?.length || 0} floors
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => startEditWing(wingIdx)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <FaEdit size={12} /> Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => copyWing(wingIdx)}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <FaCopy size={12} /> Copy
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              aria-label="Delete wing"
                              onClick={() => deleteWing(wingIdx)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={localTower.wings.length <= 1}
                            >
                              <FaTrash size={12} />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {localTower.wings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No wings added yet. Click "Add Wing" to create one.
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 p-6 bg-gray-50 border-t flex-row gap-3 sm:justify-stretch">
            <Button
              type="button"
              onClick={() => onSave(localTower)}
              className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold"
            >
              <FaCheck /> Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-6 font-semibold"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete wing confirmation (replaces window.confirm) */}
      <AlertDialog
        open={wingToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setWingToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this wing?</AlertDialogTitle>
            <AlertDialogDescription>
              {wingToDelete !== null && localTower.wings[wingToDelete]
                ? `"${localTower.wings[wingToDelete].name}" and all its floors will be removed. `
                : ""}
              This only takes effect after you click Save Changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteWing}
            >
              Delete Wing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WingManagementModal;
