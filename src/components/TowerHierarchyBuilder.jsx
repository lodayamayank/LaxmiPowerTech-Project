import React, { useState } from "react";
import {
  FaPlus,
  FaTrash,
  FaCopy,
  FaBuilding,
  FaLayerGroup,
  FaDoorOpen,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ROOM_TYPES = [
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

const FLAT_TYPES = [
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

const fieldLabelClass = "text-sm font-medium text-gray-700 mb-1.5 block";
const smallInputClass = "h-8 bg-white text-sm";

/**
 * Reusable block for Staircases / Podiums / Common Areas.
 * Full Tailwind class names are passed in via `tone` so they are not purged.
 */
const AreaSection = ({
  title,
  addLabel,
  emptyText,
  items,
  tone,
  nameClassName,
  namePlaceholder,
  secondField,
  secondPlaceholder,
  onAdd,
  onDelete,
  onUpdate,
}) => (
  <Card className={`gap-0 py-0 border-2 shadow-none rounded-lg ${tone.card}`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold flex items-center gap-2 ${tone.title}`}>
          {title}
        </h4>
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          className={`text-white ${tone.button}`}
        >
          <FaPlus /> {addLabel}
        </Button>
      </div>
      {!items || items.length === 0 ? (
        <p className={`text-sm ${tone.empty}`}>{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 bg-white p-2 rounded border ${tone.row}`}
            >
              <Input
                type="text"
                value={item.name}
                onChange={(e) => onUpdate(idx, "name", e.target.value)}
                className={`${smallInputClass} ${nameClassName}`}
                placeholder={namePlaceholder}
              />
              <Input
                type="text"
                value={item[secondField] || ""}
                onChange={(e) => onUpdate(idx, secondField, e.target.value)}
                className={`${smallInputClass} flex-1`}
                placeholder={secondPlaceholder}
              />
              <Button
                type="button"
                size="sm"
                aria-label="Delete"
                onClick={() => onDelete(idx)}
                className="bg-red-600 hover:bg-red-700 text-white px-2"
              >
                <FaTrash size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const TONES = {
  purple: {
    card: "border-purple-200 bg-purple-50",
    title: "text-purple-800",
    button: "bg-purple-600 hover:bg-purple-700",
    empty: "text-purple-600",
    row: "border-purple-300",
  },
  yellow: {
    card: "border-yellow-200 bg-yellow-50",
    title: "text-yellow-800",
    button: "bg-yellow-600 hover:bg-yellow-700",
    empty: "text-yellow-600",
    row: "border-yellow-300",
  },
  cyan: {
    card: "border-cyan-200 bg-cyan-50",
    title: "text-cyan-800",
    button: "bg-cyan-600 hover:bg-cyan-700",
    empty: "text-cyan-600",
    row: "border-cyan-300",
  },
};

const CountInput = ({ label, value, onChange }) => (
  <div>
    <Label className={fieldLabelClass}>{label}</Label>
    <Input
      type="number"
      min="0"
      max="10"
      value={value}
      onChange={(e) =>
        onChange(e.target.value === "" ? 0 : parseInt(e.target.value))
      }
      className="w-full text-sm focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30"
    />
  </div>
);

const TowerHierarchyBuilder = ({ buildings, onChange }) => {
  const [expandedTowers, setExpandedTowers] = useState({});
  // Replaces window.confirm: { title, description, actionLabel, onConfirm }
  const [confirmState, setConfirmState] = useState(null);

  // Tower Management
  const addTower = () => {
    const newBuildings = [
      ...buildings,
      {
        name: `Tower ${String.fromCharCode(65 + buildings.length)}`,
        staircases: [],
        podiums: [],
        commonAreas: [],
        wings: [
          {
            name: "Default",
            floors: [],
          },
        ],
      },
    ];
    onChange(newBuildings);
    setExpandedTowers((prev) => ({ ...prev, [buildings.length]: true }));
  };

  const updateTowerName = (towerIdx, name) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].name = name;
    onChange(newBuildings);
  };

  const deleteTower = (towerIdx) => {
    setConfirmState({
      title: "Delete this entire tower?",
      description: "This action cannot be undone.",
      actionLabel: "Delete Tower",
      onConfirm: () => {
        const newBuildings = buildings.filter((_, i) => i !== towerIdx);
        onChange(newBuildings);
      },
    });
  };

  const copyTower = (towerIdx) => {
    const newBuildings = [...buildings];
    const copiedTower = JSON.parse(JSON.stringify(buildings[towerIdx]));
    copiedTower.name = `${copiedTower.name} (Copy)`;
    newBuildings.push(copiedTower);
    onChange(newBuildings);
    setExpandedTowers((prev) => ({ ...prev, [newBuildings.length - 1]: true }));
  };

  // Floor Management
  const addFloor = (towerIdx, wingIdx) => {
    const newBuildings = [...buildings];
    const wing = newBuildings[towerIdx].wings[wingIdx];
    const floorCount = wing.floors.length;
    const lastFloorNum =
      floorCount > 0 ? wing.floors[floorCount - 1].floorNumber || 0 : 0;

    wing.floors.push({
      name: `Floor ${lastFloorNum + 1}`,
      floorNumber: lastFloorNum + 1,
      isBasement: false,
      flats: [],
    });
    onChange(newBuildings);
  };

  const addBasement = (towerIdx, wingIdx) => {
    const newBuildings = [...buildings];
    const wing = newBuildings[towerIdx].wings[wingIdx];
    const basementCount = wing.floors.filter((f) => f.isBasement).length;

    wing.floors.unshift({
      name: `B${basementCount + 1}`,
      floorNumber: -(basementCount + 1),
      isBasement: true,
      flats: [],
    });
    onChange(newBuildings);
  };

  const updateFloor = (towerIdx, wingIdx, floorIdx, field, value) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].wings[wingIdx].floors[floorIdx][field] = value;
    onChange(newBuildings);
  };

  const deleteFloor = (towerIdx, wingIdx, floorIdx) => {
    setConfirmState({
      title: "Delete this floor?",
      description: "The floor and all its flats will be removed.",
      actionLabel: "Delete Floor",
      onConfirm: () => {
        const newBuildings = [...buildings];
        newBuildings[towerIdx].wings[wingIdx].floors = newBuildings[
          towerIdx
        ].wings[wingIdx].floors.filter((_, i) => i !== floorIdx);
        onChange(newBuildings);
      },
    });
  };

  // Flat Management
  const addFlat = (towerIdx, wingIdx, floorIdx) => {
    const newBuildings = [...buildings];
    const floor = newBuildings[towerIdx].wings[wingIdx].floors[floorIdx];
    const flatCount = floor.flats.length;

    floor.flats.push({
      name: `Flat ${flatCount + 1}`,
      flatNumber: `${floor.floorNumber}0${flatCount + 1}`,
      flatType: "2BHK",
      bedroomCount: 2,
      bathroomCount: 2,
      balconyCount: 1,
      hasKitchen: true,
      hasLivingRoom: true,
      rooms: [],
      variation: "Standard",
    });
    onChange(newBuildings);
  };

  const updateFlat = (towerIdx, wingIdx, floorIdx, flatIdx, field, value) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx][
      field
    ] = value;
    onChange(newBuildings);
  };

  // Handle flat type change and auto-fill bedroom/bathroom counts
  const handleFlatTypeChange = (
    towerIdx,
    wingIdx,
    floorIdx,
    flatIdx,
    flatType
  ) => {
    const newBuildings = [...buildings];
    const flat =
      newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx];
    const commercialTypes = [
      "Office",
      "Shop",
      "Cafeteria",
      "Godown",
      "Showroom",
    ];
    const isCommercialType = commercialTypes.includes(flatType);

    // Update flat type
    flat.flatType = flatType;
    flat.unitCategory = isCommercialType ? "commercial" : "residential";
    if (!isCommercialType) {
      flat.hasLivingRoom = true;
      flat.hasKitchen = true;
    }

    // Auto-fill bedroom and bathroom counts based on flat type
    switch (flatType) {
      case "1RK":
        flat.bedroomCount = 1;
        flat.bathroomCount = 1;
        break;
      case "1BHK":
        flat.bedroomCount = 1;
        flat.bathroomCount = 1;
        break;
      case "2BHK":
        flat.bedroomCount = 2;
        flat.bathroomCount = 2;
        break;
      case "3BHK":
        flat.bedroomCount = 3;
        flat.bathroomCount = 2;
        break;
      case "4BHK":
        flat.bedroomCount = 4;
        flat.bathroomCount = 3;
        break;
      case "Studio":
        flat.bedroomCount = 0;
        flat.bathroomCount = 1;
        break;
      case "Penthouse":
        flat.bedroomCount = 4;
        flat.bathroomCount = 4;
        break;
      case "Office":
      case "Shop":
      case "Cafeteria":
      case "Godown":
      case "Showroom":
        flat.bedroomCount = 0;
        flat.bathroomCount = 1;
        flat.balconyCount = 0;
        flat.hasLivingRoom = false;
        flat.hasKitchen = flatType === "Office" || flatType === "Cafeteria";
        flat.variation = flatType;
        break;
      default:
        // For Duplex, Custom - keep existing values
        break;
    }

    onChange(newBuildings);
  };

  // Handle bedroom count change and auto-update BHK type (reverse sync)
  const handleBedroomCountChange = (
    towerIdx,
    wingIdx,
    floorIdx,
    flatIdx,
    bedroomCount
  ) => {
    const newBuildings = [...buildings];
    const flat =
      newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx];

    // Update bedroom count
    flat.bedroomCount = bedroomCount;

    // Auto-update flat type based on bedroom count
    switch (bedroomCount) {
      case 0:
        flat.flatType = "Studio";
        flat.bathroomCount = 1;
        break;
      case 1:
        flat.flatType = "1BHK";
        flat.bathroomCount = 1;
        break;
      case 2:
        flat.flatType = "2BHK";
        flat.bathroomCount = 2;
        break;
      case 3:
        flat.flatType = "3BHK";
        flat.bathroomCount = 2;
        break;
      case 4:
        flat.flatType = "4BHK";
        flat.bathroomCount = 3;
        break;
      default:
        // For 5+ bedrooms, set to Custom
        if (bedroomCount > 4) {
          flat.flatType = "Custom";
        }
        break;
    }

    onChange(newBuildings);
  };

  const deleteFlat = (towerIdx, wingIdx, floorIdx, flatIdx) => {
    setConfirmState({
      title: "Delete this flat?",
      description: "This action cannot be undone.",
      actionLabel: "Delete Flat",
      onConfirm: () => {
        const newBuildings = [...buildings];
        newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats =
          newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats.filter(
            (_, i) => i !== flatIdx
          );
        onChange(newBuildings);
      },
    });
  };

  // Room Management
  const toggleRoom = (towerIdx, wingIdx, floorIdx, flatIdx, roomType) => {
    const newBuildings = [...buildings];
    const flat =
      newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx];
    const roomIndex = flat.rooms.findIndex((r) => r.type === roomType.value);

    if (roomIndex > -1) {
      flat.rooms.splice(roomIndex, 1);
    } else {
      flat.rooms.push({ name: roomType.label, type: roomType.value });
    }
    onChange(newBuildings);
  };

  const isRoomSelected = (flat, roomType) => {
    return flat.rooms?.some((r) => r.type === roomType.value);
  };

  // Staircase Management
  const addStaircase = (towerIdx) => {
    const newBuildings = [...buildings];
    if (!newBuildings[towerIdx].staircases) {
      newBuildings[towerIdx].staircases = [];
    }
    const count = newBuildings[towerIdx].staircases.length;
    newBuildings[towerIdx].staircases.push({
      name: `Staircase ${count + 1}`,
      type: "Main Staircase",
    });
    onChange(newBuildings);
  };

  const deleteStaircase = (towerIdx, staircaseIdx) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].staircases.splice(staircaseIdx, 1);
    onChange(newBuildings);
  };

  const updateStaircase = (towerIdx, staircaseIdx, field, value) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].staircases[staircaseIdx][field] = value;
    onChange(newBuildings);
  };

  // Podium Management
  const addPodium = (towerIdx) => {
    const newBuildings = [...buildings];
    if (!newBuildings[towerIdx].podiums) {
      newBuildings[towerIdx].podiums = [];
    }
    const count = newBuildings[towerIdx].podiums.length;
    newBuildings[towerIdx].podiums.push({
      name: `P${count + 1}`,
      description: "",
    });
    onChange(newBuildings);
  };

  const deletePodium = (towerIdx, podiumIdx) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].podiums.splice(podiumIdx, 1);
    onChange(newBuildings);
  };

  const updatePodium = (towerIdx, podiumIdx, field, value) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].podiums[podiumIdx][field] = value;
    onChange(newBuildings);
  };

  // Common Area Management
  const addCommonArea = (towerIdx) => {
    const newBuildings = [...buildings];
    if (!newBuildings[towerIdx].commonAreas) {
      newBuildings[towerIdx].commonAreas = [];
    }
    const count = newBuildings[towerIdx].commonAreas.length;
    newBuildings[towerIdx].commonAreas.push({
      name: `CA${count + 1}`,
      description: "",
    });
    onChange(newBuildings);
  };

  const deleteCommonArea = (towerIdx, areaIdx) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].commonAreas.splice(areaIdx, 1);
    onChange(newBuildings);
  };

  const updateCommonArea = (towerIdx, areaIdx, field, value) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].commonAreas[areaIdx][field] = value;
    onChange(newBuildings);
  };

  // Auto-generate rooms based on flat configuration
  const autoGenerateRooms = (towerIdx, wingIdx, floorIdx, flatIdx) => {
    const newBuildings = [...buildings];
    const flat =
      newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx];
    const rooms = [];

    // Add living room
    if (flat.hasLivingRoom) {
      rooms.push({ name: "Living Room / Hall", type: "living_room" });
    }

    // Add numbered bedrooms
    for (let i = 1; i <= (flat.bedroomCount || 0); i++) {
      rooms.push({ name: `Bedroom ${i}`, type: "bedroom" });
    }

    // Add kitchen
    if (flat.hasKitchen) {
      rooms.push({ name: "Kitchen", type: "kitchen" });
    }

    // Add numbered bathrooms
    for (let i = 1; i <= (flat.bathroomCount || 0); i++) {
      rooms.push({ name: `Bathroom ${i}`, type: "bathroom" });
    }

    // Add numbered balconies
    for (let i = 1; i <= (flat.balconyCount || 0); i++) {
      rooms.push({ name: `Balcony ${i}`, type: "balcony" });
    }

    flat.rooms = rooms;
    onChange(newBuildings);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaBuilding className="text-orange-600" />
            Tower-Based Project Structure
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Build your project hierarchy: Tower → Floor → Flat → Rooms
          </p>
        </div>
        <Button
          type="button"
          onClick={addTower}
          className="bg-orange-600 hover:bg-orange-700 text-white shadow-md"
        >
          <FaPlus /> Add Tower
        </Button>
      </div>

      {buildings.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <FaBuilding className="text-gray-400 dark:text-gray-500 text-5xl mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-300 font-medium">
            No towers added yet
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Click "Add Tower" to start building your project structure
          </p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={buildings
            .map((_, index) => String(index))
            .filter((value) => expandedTowers[value])}
          onValueChange={(values) =>
            setExpandedTowers(() => {
              const expandedValues = new Set(values);
              return Object.fromEntries(
                buildings.map((_, index) => [
                  index,
                  expandedValues.has(String(index)),
                ])
              );
            })
          }
          className="space-y-4"
        >
          {buildings.map((tower, tIdx) => (
            <AccordionItem
              key={tIdx}
              value={String(tIdx)}
              className="overflow-hidden rounded-xl border-2 border-orange-200 bg-white shadow-sm"
            >
              {/* Tower Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                <div className="flex items-center gap-3">
                  <AccordionTrigger
                    aria-label={`Toggle tower ${tower.name || tIdx + 1}`}
                    className="h-8 w-8 flex-none justify-center rounded p-1 text-white hover:bg-white/20 hover:no-underline"
                  />
                  <FaBuilding className="text-white text-xl" />
                  <Input
                    type="text"
                    value={tower.name}
                    onChange={(e) => updateTowerName(tIdx, e.target.value)}
                    placeholder="Tower Name"
                    className="flex-1 h-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 font-semibold focus-visible:bg-white/30 focus-visible:border-white/50 focus-visible:ring-white/30"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => copyTower(tIdx)}
                    className="bg-white/20 hover:bg-white/30 text-white"
                    title="Copy Tower"
                  >
                    <FaCopy /> Copy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    aria-label="Delete tower"
                    onClick={() => deleteTower(tIdx)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    title="Delete Tower"
                  >
                    <FaTrash />
                  </Button>
                </div>
              </div>

              {/* Tower Content */}
              <AccordionContent className="p-4">
                <div className="space-y-4">
                  <AreaSection
                    title="🪜 Staircases"
                    addLabel="Add Staircase"
                    emptyText="No staircases added yet"
                    items={tower.staircases}
                    tone={TONES.purple}
                    nameClassName="flex-1"
                    namePlaceholder="Staircase name"
                    secondField="type"
                    secondPlaceholder="Type (e.g., Main, Service)"
                    onAdd={() => addStaircase(tIdx)}
                    onDelete={(i) => deleteStaircase(tIdx, i)}
                    onUpdate={(i, field, value) =>
                      updateStaircase(tIdx, i, field, value)
                    }
                  />

                  <AreaSection
                    title="🏛️ Podiums"
                    addLabel="Add Podium"
                    emptyText="No podiums added yet"
                    items={tower.podiums}
                    tone={TONES.yellow}
                    nameClassName="w-24 flex-none font-medium"
                    namePlaceholder="P1, P2..."
                    secondField="description"
                    secondPlaceholder="Description (optional)"
                    onAdd={() => addPodium(tIdx)}
                    onDelete={(i) => deletePodium(tIdx, i)}
                    onUpdate={(i, field, value) =>
                      updatePodium(tIdx, i, field, value)
                    }
                  />

                  <AreaSection
                    title="🏢 Common Areas"
                    addLabel="Add Common Area"
                    emptyText="No common areas added yet"
                    items={tower.commonAreas}
                    tone={TONES.cyan}
                    nameClassName="w-24 flex-none font-medium"
                    namePlaceholder="CA1, CA2..."
                    secondField="description"
                    secondPlaceholder="Description (e.g., Gym, Pool)"
                    onAdd={() => addCommonArea(tIdx)}
                    onDelete={(i) => deleteCommonArea(tIdx, i)}
                    onUpdate={(i, field, value) =>
                      updateCommonArea(tIdx, i, field, value)
                    }
                  />

                  {/* Wings and Floors */}
                  {tower.wings?.map((wing, wIdx) => (
                    <div key={wIdx} className="pt-0">
                      {/* Floor Management Buttons */}
                      <div className="flex gap-2 mb-4">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addFloor(tIdx, wIdx)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FaPlus /> Add Floor
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addBasement(tIdx, wIdx)}
                          className="bg-gray-600 hover:bg-gray-700 text-white"
                        >
                          <FaPlus /> Add Basement
                        </Button>
                      </div>

                      {/* Floors List */}
                      {wing.floors?.length === 0 ? (
                        <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200">
                          <FaLayerGroup className="text-blue-400 text-3xl mx-auto mb-2" />
                          <p className="text-blue-600 text-sm">
                            No floors added yet. Add a floor or basement to get
                            started.
                          </p>
                        </div>
                      ) : (
                        <Accordion type="multiple" className="space-y-3">
                          {wing.floors.map((floor, fIdx) => {
                            const floorKey = `${tIdx}-${wIdx}-${fIdx}`;
                            return (
                              <AccordionItem
                                key={fIdx}
                                value={`floor-${floorKey}`}
                                className={`rounded-lg border-2 ${
                                  floor.isBasement
                                    ? "border-gray-300 bg-gray-50"
                                    : "border-blue-200 bg-blue-50"
                                }`}
                              >
                                {/* Floor Header */}
                                <div className="p-3">
                                  <div className="flex items-center gap-2">
                                    <AccordionTrigger
                                      aria-label={`Toggle floor ${
                                        floor.name || fIdx + 1
                                      }`}
                                      className="h-8 w-8 flex-none justify-center rounded p-1 text-gray-600 hover:text-gray-800 hover:no-underline"
                                    />
                                    <FaLayerGroup
                                      className={
                                        floor.isBasement
                                          ? "text-gray-600"
                                          : "text-blue-600"
                                      }
                                    />
                                    <Input
                                      type="text"
                                      value={floor.name}
                                      onChange={(e) =>
                                        updateFloor(
                                          tIdx,
                                          wIdx,
                                          fIdx,
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Floor Name"
                                      className="flex-1 bg-white text-sm font-medium focus-visible:border-blue-500 focus-visible:ring-blue-500/30"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => addFlat(tIdx, wIdx, fIdx)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <FaPlus /> Unit
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      aria-label="Delete floor"
                                      onClick={() =>
                                        deleteFloor(tIdx, wIdx, fIdx)
                                      }
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      <FaTrash />
                                    </Button>
                                  </div>
                                </div>

                                {/* Flats */}
                                <AccordionContent className="p-3 pt-0">
                                  {floor.flats?.length === 0 ? (
                                    <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                                      <FaDoorOpen className="text-gray-400 text-2xl mx-auto mb-2" />
                                      <p className="text-gray-500 text-sm">
                                        No units added. Click "Add Unit" to add
                                        units to this floor.
                                      </p>
                                    </div>
                                  ) : (
                                    <Accordion
                                      type="multiple"
                                      className="space-y-2"
                                    >
                                      {floor.flats.map((flat, flatIdx) => {
                                        const flatKey = `${tIdx}-${wIdx}-${fIdx}-${flatIdx}`;
                                        return (
                                          <AccordionItem
                                            key={flatIdx}
                                            value={`flat-${flatKey}`}
                                            className="rounded-lg border-2 border-green-200 bg-green-50"
                                          >
                                            {/* Flat Header */}
                                            <div className="p-3">
                                              <div className="flex items-center gap-2">
                                                <AccordionTrigger
                                                  aria-label={`Toggle flat ${
                                                    flat.name || flatIdx + 1
                                                  }`}
                                                  className="h-8 w-8 flex-none justify-center rounded p-1 text-gray-600 hover:text-gray-800 hover:no-underline"
                                                />
                                                <FaDoorOpen className="text-green-600" />
                                                <Input
                                                  type="text"
                                                  value={flat.name}
                                                  onChange={(e) =>
                                                    updateFlat(
                                                      tIdx,
                                                      wIdx,
                                                      fIdx,
                                                      flatIdx,
                                                      "name",
                                                      e.target.value
                                                    )
                                                  }
                                                  placeholder="Flat Name"
                                                  className={`${smallInputClass} flex-1 font-medium focus-visible:border-green-500 focus-visible:ring-green-500/30`}
                                                />
                                                <Input
                                                  type="text"
                                                  value={flat.flatNumber || ""}
                                                  onChange={(e) =>
                                                    updateFlat(
                                                      tIdx,
                                                      wIdx,
                                                      fIdx,
                                                      flatIdx,
                                                      "flatNumber",
                                                      e.target.value
                                                    )
                                                  }
                                                  placeholder="Flat No."
                                                  className={`${smallInputClass} w-24 flex-none focus-visible:border-green-500 focus-visible:ring-green-500/30`}
                                                />
                                                <Select
                                                  value={
                                                    flat.flatType || "2BHK"
                                                  }
                                                  onValueChange={(val) =>
                                                    handleFlatTypeChange(
                                                      tIdx,
                                                      wIdx,
                                                      fIdx,
                                                      flatIdx,
                                                      val
                                                    )
                                                  }
                                                >
                                                  <SelectTrigger
                                                    aria-label="Flat type"
                                                    className="w-32 flex-none bg-white text-sm data-[size=default]:h-8 focus-visible:border-green-500 focus-visible:ring-green-500/30"
                                                  >
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {FLAT_TYPES.map((type) => (
                                                      <SelectItem
                                                        key={type}
                                                        value={type}
                                                      >
                                                        {type}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  aria-label="Delete flat"
                                                  onClick={() =>
                                                    deleteFlat(
                                                      tIdx,
                                                      wIdx,
                                                      fIdx,
                                                      flatIdx
                                                    )
                                                  }
                                                  className="bg-red-600 hover:bg-red-700 text-white px-2"
                                                >
                                                  <FaTrash />
                                                </Button>
                                              </div>
                                            </div>

                                            {/* Flat Configuration & Rooms */}
                                            <AccordionContent className="px-3 pb-3 space-y-4">
                                              {/* Flat Configuration */}
                                              <Card className="gap-0 py-0 rounded-lg border-2 border-indigo-200 bg-white shadow-sm">
                                                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-3 border-b border-indigo-200 rounded-t-lg">
                                                  <h4 className="text-sm font-bold text-indigo-900">
                                                    Unit Configuration
                                                  </h4>
                                                  <p className="text-xs text-indigo-600 mt-0.5">
                                                    Configure bedroom, bathroom,
                                                    balcony, and unit details
                                                  </p>
                                                </div>
                                                <CardContent className="p-4">
                                                  <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                      <Label
                                                        className={
                                                          fieldLabelClass
                                                        }
                                                      >
                                                        Variation
                                                      </Label>
                                                      <Input
                                                        type="text"
                                                        value={
                                                          flat.variation ||
                                                          "Standard"
                                                        }
                                                        onChange={(e) =>
                                                          updateFlat(
                                                            tIdx,
                                                            wIdx,
                                                            fIdx,
                                                            flatIdx,
                                                            "variation",
                                                            e.target.value
                                                          )
                                                        }
                                                        placeholder="e.g., Premium, Standard, Deluxe"
                                                        className="w-full text-sm focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30"
                                                      />
                                                    </div>
                                                    <CountInput
                                                      label="Bedrooms"
                                                      value={
                                                        flat.bedroomCount ?? 2
                                                      }
                                                      onChange={(val) =>
                                                        handleBedroomCountChange(
                                                          tIdx,
                                                          wIdx,
                                                          fIdx,
                                                          flatIdx,
                                                          val
                                                        )
                                                      }
                                                    />
                                                    <CountInput
                                                      label="Bathrooms"
                                                      value={
                                                        flat.bathroomCount ?? 2
                                                      }
                                                      onChange={(val) =>
                                                        updateFlat(
                                                          tIdx,
                                                          wIdx,
                                                          fIdx,
                                                          flatIdx,
                                                          "bathroomCount",
                                                          val
                                                        )
                                                      }
                                                    />
                                                    <CountInput
                                                      label="Balconies"
                                                      value={
                                                        flat.balconyCount ?? 1
                                                      }
                                                      onChange={(val) =>
                                                        updateFlat(
                                                          tIdx,
                                                          wIdx,
                                                          fIdx,
                                                          flatIdx,
                                                          "balconyCount",
                                                          val
                                                        )
                                                      }
                                                    />
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                                                    <Label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                                                      <Checkbox
                                                        checked={
                                                          flat.hasLivingRoom !==
                                                          false
                                                        }
                                                        onCheckedChange={(
                                                          checked
                                                        ) =>
                                                          updateFlat(
                                                            tIdx,
                                                            wIdx,
                                                            fIdx,
                                                            flatIdx,
                                                            "hasLivingRoom",
                                                            checked === true
                                                          )
                                                        }
                                                        className="w-4 h-4 border-indigo-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white"
                                                      />
                                                      <span className="text-sm font-medium text-gray-700">
                                                        Living Room
                                                      </span>
                                                    </Label>
                                                    <Label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                                                      <Checkbox
                                                        checked={
                                                          flat.hasKitchen !==
                                                          false
                                                        }
                                                        onCheckedChange={(
                                                          checked
                                                        ) =>
                                                          updateFlat(
                                                            tIdx,
                                                            wIdx,
                                                            fIdx,
                                                            flatIdx,
                                                            "hasKitchen",
                                                            checked === true
                                                          )
                                                        }
                                                        className="w-4 h-4 border-indigo-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white"
                                                      />
                                                      <span className="text-sm font-medium text-gray-700">
                                                        Kitchen
                                                      </span>
                                                    </Label>
                                                  </div>

                                                  <Button
                                                    type="button"
                                                    onClick={() =>
                                                      autoGenerateRooms(
                                                        tIdx,
                                                        wIdx,
                                                        fIdx,
                                                        flatIdx
                                                      )
                                                    }
                                                    className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
                                                  >
                                                    ⚡ Auto-Generate Rooms
                                                  </Button>
                                                </CardContent>
                                              </Card>

                                              {/* Room Selection */}
                                              <Card className="gap-0 py-0 rounded-lg border-2 border-green-200 bg-white shadow-sm">
                                                <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 border-b border-green-200 rounded-t-lg">
                                                  <h4 className="text-sm font-bold text-green-900">
                                                    Room Types (Manual
                                                    Selection)
                                                  </h4>
                                                  <p className="text-xs text-green-600 mt-0.5">
                                                    Manually select additional
                                                    room types if needed
                                                  </p>
                                                </div>
                                                <CardContent className="p-4">
                                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {ROOM_TYPES.map(
                                                      (roomType) => (
                                                        <Label
                                                          key={roomType.value}
                                                          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                            isRoomSelected(
                                                              flat,
                                                              roomType
                                                            )
                                                              ? "border-green-500 bg-green-50"
                                                              : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50"
                                                          }`}
                                                        >
                                                          <Checkbox
                                                            checked={
                                                              !!isRoomSelected(
                                                                flat,
                                                                roomType
                                                              )
                                                            }
                                                            onCheckedChange={() =>
                                                              toggleRoom(
                                                                tIdx,
                                                                wIdx,
                                                                fIdx,
                                                                flatIdx,
                                                                roomType
                                                              )
                                                            }
                                                            className="w-4 h-4 border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 data-[state=checked]:text-white"
                                                          />
                                                          <span className="text-sm font-medium text-gray-700">
                                                            {roomType.label}
                                                          </span>
                                                        </Label>
                                                      )
                                                    )}
                                                  </div>

                                                  {flat.rooms?.length > 0 && (
                                                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                                      <p className="text-xs font-semibold text-green-800 mb-2">
                                                        Selected Rooms (
                                                        {flat.rooms.length}):
                                                      </p>
                                                      <div className="flex flex-wrap gap-1.5">
                                                        {flat.rooms.map(
                                                          (r, rIdx) => (
                                                            <Badge
                                                              key={`${r.type}-${rIdx}`}
                                                              variant="secondary"
                                                              className="bg-white text-gray-700 border border-green-200 text-xs font-normal"
                                                            >
                                                              {r.name}
                                                            </Badge>
                                                          )
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                </CardContent>
                                              </Card>
                                            </AccordionContent>
                                          </AccordionItem>
                                        );
                                      })}
                                    </Accordion>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Structure Summary */}
      {buildings.length > 0 && (
        <Card className="gap-0 py-0 mt-4 rounded-lg border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-none">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              📊 Project Summary:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Towers</p>
                <p className="text-xl font-bold text-orange-600">
                  {buildings.length}
                </p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Staircases</p>
                <p className="text-xl font-bold text-purple-600">
                  {buildings.reduce(
                    (sum, t) => sum + (t.staircases?.length || 0),
                    0
                  )}
                </p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Podiums</p>
                <p className="text-xl font-bold text-yellow-600">
                  {buildings.reduce(
                    (sum, t) => sum + (t.podiums?.length || 0),
                    0
                  )}
                </p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Common Areas</p>
                <p className="text-xl font-bold text-cyan-600">
                  {buildings.reduce(
                    (sum, t) => sum + (t.commonAreas?.length || 0),
                    0
                  )}
                </p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Total Floors</p>
                <p className="text-xl font-bold text-blue-600">
                  {buildings.reduce(
                    (sum, t) => sum + (t.wings?.[0]?.floors?.length || 0),
                    0
                  )}
                </p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Total Flats</p>
                <p className="text-xl font-bold text-green-600">
                  {buildings.reduce(
                    (sum, t) =>
                      sum +
                      (t.wings?.[0]?.floors?.reduce(
                        (fSum, f) => fSum + (f.flats?.length || 0),
                        0
                      ) || 0),
                    0
                  )}
                </p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Basements</p>
                <p className="text-xl font-bold text-gray-600">
                  {buildings.reduce(
                    (sum, t) =>
                      sum +
                      (t.wings?.[0]?.floors?.filter((f) => f.isBasement)
                        ?.length || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation (replaces window.confirm) */}
      <AlertDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                confirmState?.onConfirm?.();
                setConfirmState(null);
              }}
            >
              {confirmState?.actionLabel || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TowerHierarchyBuilder;
