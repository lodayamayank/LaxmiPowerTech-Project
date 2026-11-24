// src/pages/projects/components/builder/hierarchyConstants.js
// Room and flat types of the manual tower builder (moved unchanged from TowerHierarchyBuilder.jsx).
// Note: SmartTowerBuilder has its own ROOM_TYPES / FLAT_TYPES (generatorConstants.js) with different contents; they are not merged.
export const ROOM_TYPES = [
  { value: "living_room", label: "Living Room / Hall" },
  { value: "bedroom", label: "Bedroom" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "balcony", label: "Balcony" },
  { value: "utility", label: "Utility / Store" },
  { value: "dining", label: "Dining Room" },
  { value: "study", label: "Study Room" },
  { value: "pooja", label: "Pooja Room" },
  { value: "terrace", label: "Terrace" },
];

export const FLAT_TYPES = [
  "1RK",
  "1BHK",
  "2BHK",
  "3BHK",
  "4BHK",
  "Studio",
  "Penthouse",
  "Duplex",
  "Office",
  "Shop",
  "Cafeteria",
  "Godown",
  "Showroom",
  "Custom",
];

// Full class names so Tailwind keeps them.
export const AREA_TONES = {
  purple: { card: "border-line bg-tone-purple-soft", title: "text-tone-purple-fg" },
  yellow: { card: "border-line bg-tone-warn-soft", title: "text-tone-warn-fg" },
  cyan: { card: "border-line bg-tone-info-soft", title: "text-tone-info-fg" },
};
