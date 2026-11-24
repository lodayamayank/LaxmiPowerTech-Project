// src/pages/projects/components/ProjectSheet.jsx
// Create / edit project in a right-side panel (loaded lazily). Same fields, same builder, same submit as the old inline card.
import { Check, ChevronsUpDown, MapPin, Plus } from "lucide-react";
import { Autocomplete } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetPanel, SheetPanelBody, SheetPanelFooter, SheetPanelHeader } from "@/components/ui/sheet";
import { FormField } from "@/components/common/FormField";
import SmartTowerBuilder from "./SmartTowerBuilder";

export default function ProjectSheet({ p }) {
  const {
    sheetOpen, editingId, formData, setFormData, branches, mapsLoaded, onAutocompleteLoad, onPlaceChanged, handleSubmit, handleCancel,
  } = p;

  const addressInput = (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
      <Input
        id="project-address"
        className="pl-9"
        placeholder="Enter project address"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      />
    </div>
  );

  return (
    <Sheet open={sheetOpen} onOpenChange={(open) => !open && handleCancel()}>
      <SheetPanel onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <SheetPanelHeader
          title={editingId ? "Edit project" : "New project"}
          description="Build Tower > Floor > Flat > Rooms, or generate it in one go."
        />
        <SheetPanelBody className="space-y-5">
          <FormField label="Project Name" htmlFor="project-name" required>
            <Input
              id="project-name"
              placeholder="Enter project name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>

          <FormField label="Address" htmlFor="project-address" required>
            {mapsLoaded ? (
              <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged} options={{ componentRestrictions: { country: "in" } }}>
                {addressInput}
              </Autocomplete>
            ) : (
              addressInput
            )}
          </FormField>

          <FormField
            label="Assign Branches"
            htmlFor="project-branches"
            hint={formData.branches.length > 0 ? `${formData.branches.length} branch(es) selected` : "Select one or more branches."}
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button id="project-branches" type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {formData.branches.length > 0 ? `${formData.branches.length} branch(es) selected` : "Select branches..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {branches.map((branch) => {
                    const isSelected = formData.branches.includes(branch._id);
                    return (
                      <div
                        key={branch._id}
                        className="flex cursor-pointer items-center gap-2 rounded-control p-2 hover:bg-surface-muted"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            branches: isSelected ? prev.branches.filter((id) => id !== branch._id) : [...prev.branches, branch._id],
                          }));
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setFormData((prev) => ({
                              ...prev,
                              branches: checked
                                ? prev.branches.includes(branch._id)
                                  ? prev.branches
                                  : [...prev.branches, branch._id]
                                : prev.branches.filter((id) => id !== branch._id),
                            }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-small">{branch.name}</span>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </FormField>

          {/* Smart Tower Builder */}
          <SmartTowerBuilder buildings={formData.buildings} onChange={(buildings) => setFormData({ ...formData, buildings })} />
        </SheetPanelBody>
        <SheetPanelFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {editingId ? <Check /> : <Plus />}
            {editingId ? "Update Project" : "Create Project"}
          </Button>
        </SheetPanelFooter>
      </SheetPanel>
    </Sheet>
  );
}
