// src/pages/projects/components/TaskFormDialog.jsx
// Create / edit task form with the project > building > floor > flat > room selectors.
// State and handlers come from useAdminTasks; this only lays the form out (same fields, order and messages).
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";

const LEVEL_3_ACTIVITIES = ["Slab Conduiting", "Box Fixing", "Wiring", "Switch Plate", "Testing And Commissioning"];

// shadcn SelectItem can't have value="", so "no selection" options use a sentinel
const NO_ACTIVITY = "none";

/** Thin wrapper around Select so every dropdown is built the same way. items: [{ value, label }] */
const FieldSelect = ({ id, value, onValueChange, placeholder, items, disabled = false }) => (
  <Select value={value || ""} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger id={id}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default function TaskFormDialog({ t }) {
  const {
    showCreateModal, showEditModal, closeFormModal, isEditing, handleCreateTask, handleUpdateTask, formData, handleFormChange,
    projects, formSupervisors, hierarchy, setHierarchy, fetchHierarchy, selectedBuilding, setSelectedBuilding, selectedFloor,
    setSelectedFloor, selectedFlat, setSelectedFlat, selectedRoom, setSelectedRoom, selectedLevel3Activity,
    setSelectedLevel3Activity, getFloors, getFlats, getRooms, fileInputKey, submitting,
  } = t;

  return (
    <Dialog
      open={showCreateModal || showEditModal}
      onOpenChange={(open) => {
        if (!open) closeFormModal();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription className="sr-only">
            Choose the project, supervisor and work location, then save the task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={isEditing ? handleUpdateTask : handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Project" htmlFor="task-project" required>
              <FieldSelect
                id="task-project"
                value={formData.project}
                placeholder="Select Project"
                items={projects.map((p) => ({ value: p._id, label: p.name }))}
                onValueChange={(val) => {
                  handleFormChange("project", val);
                  handleFormChange("supervisor", "");
                  setSelectedBuilding(null);
                  setSelectedFloor(null);
                  setSelectedFlat(null);
                  setSelectedRoom(null);
                  setSelectedLevel3Activity(null);
                  if (val) fetchHierarchy(val);
                  else setHierarchy({ buildings: [] });
                }}
              />
            </FormField>

            <FormField label="Supervisor" htmlFor="task-supervisor" required>
              <FieldSelect
                id="task-supervisor"
                value={formData.supervisor}
                disabled={!formData.project}
                placeholder={
                  !formData.project ? "Select project first" : formSupervisors.length === 0 ? "No assigned supervisors" : "Select Supervisor"
                }
                items={formSupervisors.map((s) => ({ value: s._id, label: `${s.name} (${s.role})` }))}
                onValueChange={(val) => handleFormChange("supervisor", val)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Building / Tower" htmlFor="task-building" required>
              <FieldSelect
                id="task-building"
                value={selectedBuilding?._id}
                disabled={!formData.project || hierarchy.buildings.length === 0}
                placeholder={
                  !formData.project ? "Select a project first" : hierarchy.buildings.length === 0 ? "No buildings found" : "Select Building"
                }
                items={(hierarchy.buildings || []).map((b) => ({ value: b._id, label: b.name }))}
                onValueChange={(val) => {
                  const bldg = hierarchy.buildings?.find((b) => b._id === val) || null;
                  setSelectedBuilding(bldg);
                  setSelectedFloor(null);
                  setSelectedFlat(null);
                  setSelectedRoom(null);
                }}
              />
            </FormField>

            <FormField label="Activity (Optional)" htmlFor="task-activity">
              <FieldSelect
                id="task-activity"
                value={selectedLevel3Activity || NO_ACTIVITY}
                placeholder="No Activity"
                items={[{ value: NO_ACTIVITY, label: "No Activity" }, ...LEVEL_3_ACTIVITIES.map((a) => ({ value: a, label: a }))]}
                onValueChange={(val) => setSelectedLevel3Activity(val === NO_ACTIVITY ? null : val)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField label="Floor" htmlFor="task-floor" required>
              <FieldSelect
                id="task-floor"
                value={selectedFloor?._id}
                disabled={!selectedBuilding}
                placeholder={!selectedBuilding ? "Select building first" : "Select Floor"}
                items={getFloors().map((f) => ({ value: f._id, label: f.name }))}
                onValueChange={(val) => {
                  setSelectedFloor(getFloors().find((f) => f._id === val) || null);
                  setSelectedFlat(null);
                  setSelectedRoom(null);
                }}
              />
            </FormField>

            <FormField label="Flat" htmlFor="task-flat" required>
              <FieldSelect
                id="task-flat"
                value={selectedFlat?._id}
                disabled={!selectedFloor}
                placeholder={!selectedFloor ? "Select floor first" : "Select Flat"}
                items={getFlats().map((f) => ({ value: f._id, label: `${f.name}${f.flatType ? ` (${f.flatType})` : ""}` }))}
                onValueChange={(val) => {
                  setSelectedFlat(getFlats().find((f) => f._id === val) || null);
                  setSelectedRoom(null);
                }}
              />
            </FormField>

            <FormField label="Room" htmlFor="task-room" required>
              <FieldSelect
                id="task-room"
                value={selectedRoom?._id}
                disabled={!selectedFlat}
                placeholder={!selectedFlat ? "Select flat first" : "Select Room"}
                items={getRooms().map((r) => ({ value: r._id, label: r.name }))}
                onValueChange={(val) => setSelectedRoom(getRooms().find((r) => r._id === val) || null)}
              />
            </FormField>
          </div>

          <FormField label={`Photo ${isEditing ? "(Upload new to replace)" : "(Optional)"}`} htmlFor="task-photo">
            <Input
              key={fileInputKey}
              id="task-photo"
              type="file"
              accept="image/*"
              onChange={(e) => handleFormChange("photo", e.target.files[0] || null)}
            />
          </FormField>

          <FormField label="Notes" htmlFor="task-notes">
            <Textarea
              id="task-notes"
              value={formData.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
            />
          </FormField>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
