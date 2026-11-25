// src/pages/admin/components/BranchForm.jsx
// Add / edit branch: place search, map with geofence circle, name, radius. Same handlers and validation as before.
import { Check, Plus } from "lucide-react";
import { Autocomplete, CircleF, GoogleMap, MarkerF } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/FormField";
import { SectionCard } from "@/components/common/SectionCard";

const MAP_STYLE = { height: "400px", width: "100%" };
const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 5;

// Google Maps cannot read CSS variables, so the circle colour is resolved from the --primary token at render time.
const mapPrimaryColor = () => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    if (v) return `hsl(${v.split(/\s+/).join(",")})`;
  } catch {
    /* fall through */
  }
  return "hsl(224,64%,33%)";
};

export default function BranchForm({ b }) {
  const {
    editingId, formData, setFormData, searchInput, setSearchInput, autocompleteRef, isLoaded, onMapLoad, handleMapClick,
    onPlaceChanged, handleSubmit, handleCancelEdit,
  } = b;
  const color = mapPrimaryColor();

  return (
    <SectionCard id="branch-form" className="scroll-mt-4" title={editingId ? "Edit branch" : "Add branch"} description="People can only punch in inside the geofence.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Search Location" htmlFor="branch-search" required hint='Tip: try searching "Mahim Mumbai" or a PIN code if the full address fails.'>
          {isLoaded ? (
            <Autocomplete onLoad={(ac) => (autocompleteRef.current = ac)} onPlaceChanged={onPlaceChanged}>
              <Input id="branch-search" type="text" placeholder="Search for a place or address" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </Autocomplete>
          ) : (
            <Input id="branch-search" type="text" placeholder="Loading Google Maps..." disabled />
          )}
        </FormField>

        <div>
          <p className="mb-1.5 text-small font-medium text-ink-1">Select Location on Map</p>
          {isLoaded && (
            <div className="overflow-hidden rounded-card border border-line-card">
              <GoogleMap
                mapContainerStyle={MAP_STYLE}
                center={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : DEFAULT_CENTER}
                zoom={formData.lat ? 15 : DEFAULT_ZOOM}
                options={{ disableDefaultUI: true, zoomControl: true, clickableIcons: false }}
                onLoad={onMapLoad}
                onClick={handleMapClick}
              >
                {formData.lat && formData.lng && (
                  <>
                    <MarkerF position={{ lat: formData.lat, lng: formData.lng }} />
                    <CircleF
                      center={{ lat: formData.lat, lng: formData.lng }}
                      radius={Number(formData.radius) || 0}
                      options={{ fillColor: color, fillOpacity: 0.15, strokeColor: color, strokeOpacity: 0.6, strokeWeight: 2 }}
                    />
                  </>
                )}
              </GoogleMap>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Branch Name" htmlFor="branch-name" required>
            <Input id="branch-name" type="text" placeholder="Enter branch name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </FormField>
          <FormField label="Radius (meters)" htmlFor="branch-radius" required>
            <Input
              id="branch-radius"
              type="number"
              placeholder="Enter radius"
              value={formData.radius}
              onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value || "0", 10) })}
            />
          </FormField>
        </div>

        <FormField label="Address" htmlFor="branch-address">
          <Input id="branch-address" type="text" className="bg-surface-muted" readOnly value={formData.address || "Select location on map or search above"} />
        </FormField>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit">
            {editingId ? <Check /> : <Plus />}
            {editingId ? "Update Branch" : "Save Branch"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </SectionCard>
  );
}
