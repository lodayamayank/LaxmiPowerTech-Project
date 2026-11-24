// src/pages/projects/components/TowerHierarchyBuilder.jsx
// Editable Tower > Floor > Flat > Rooms tree. State handlers are moved unchanged; presentation lives in builder/.
import { useState } from "react";
import { Building2, Copy, Plus, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { AreaSection } from "./builder/AreaSection";
import { AREA_TONES } from "./builder/hierarchyConstants";
import FloorList from "./builder/FloorList";
import StructureSummary from "./builder/StructureSummary";

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

  const h = { addFloor, addBasement, updateFloor, deleteFloor, addFlat, updateFlat, deleteFlat, handleFlatTypeChange, handleBedroomCountChange, autoGenerateRooms, toggleRoom, isRoomSelected };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-card-title text-ink-1">Tower-Based Project Structure</h3>
          <p className="text-caption-lg text-ink-3">Build your project hierarchy: Tower → Floor → Flat → Rooms</p>
        </div>
        <Button type="button" onClick={addTower}>
          <Plus /> Add Tower
        </Button>
      </div>

      {buildings.length === 0 ? (
        <EmptyState icon={Building2} title="No towers added yet" description='Click "Add Tower" to start building your project structure' />
      ) : (
        <Accordion
          type="multiple"
          value={buildings.map((_, index) => String(index)).filter((value) => expandedTowers[value])}
          onValueChange={(values) =>
            setExpandedTowers(() => {
              const expandedValues = new Set(values);
              return Object.fromEntries(buildings.map((_, index) => [index, expandedValues.has(String(index))]));
            })
          }
          className="space-y-4"
        >
          {buildings.map((tower, tIdx) => (
            <AccordionItem key={tIdx} value={String(tIdx)} className="overflow-hidden rounded-card border border-line-card bg-surface">
              {/* Tower Header */}
              <div className="border-b border-line bg-surface-muted p-3">
                <div className="flex items-center gap-3">
                  <AccordionTrigger
                    aria-label={`Toggle tower ${tower.name || tIdx + 1}`}
                    className="h-8 w-8 flex-none justify-center rounded p-1 text-ink-3 hover:text-ink-1 hover:no-underline"
                  />
                  <Building2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <Input
                    type="text"
                    value={tower.name}
                    onChange={(e) => updateTowerName(tIdx, e.target.value)}
                    placeholder="Tower Name"
                    aria-label="Tower name"
                    className="flex-1 font-semibold"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => copyTower(tIdx)} title="Copy Tower">
                    <Copy /> Copy
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete tower"
                    onClick={() => deleteTower(tIdx)}
                    className="h-control-sm w-control-sm text-tone-bad-fg"
                    title="Delete Tower"
                  >
                    <Trash2 />
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
                    tone={AREA_TONES.purple}
                    nameClassName="flex-1"
                    namePlaceholder="Staircase name"
                    secondField="type"
                    secondPlaceholder="Type (e.g., Main, Service)"
                    onAdd={() => addStaircase(tIdx)}
                    onDelete={(i) => deleteStaircase(tIdx, i)}
                    onUpdate={(i, field, value) => updateStaircase(tIdx, i, field, value)}
                  />
                  <AreaSection
                    title="🏛️ Podiums"
                    addLabel="Add Podium"
                    emptyText="No podiums added yet"
                    items={tower.podiums}
                    tone={AREA_TONES.yellow}
                    nameClassName="w-24 flex-none font-medium"
                    namePlaceholder="P1, P2..."
                    secondField="description"
                    secondPlaceholder="Description (optional)"
                    onAdd={() => addPodium(tIdx)}
                    onDelete={(i) => deletePodium(tIdx, i)}
                    onUpdate={(i, field, value) => updatePodium(tIdx, i, field, value)}
                  />
                  <AreaSection
                    title="🏢 Common Areas"
                    addLabel="Add Common Area"
                    emptyText="No common areas added yet"
                    items={tower.commonAreas}
                    tone={AREA_TONES.cyan}
                    nameClassName="w-24 flex-none font-medium"
                    namePlaceholder="CA1, CA2..."
                    secondField="description"
                    secondPlaceholder="Description (e.g., Gym, Pool)"
                    onAdd={() => addCommonArea(tIdx)}
                    onDelete={(i) => deleteCommonArea(tIdx, i)}
                    onUpdate={(i, field, value) => updateCommonArea(tIdx, i, field, value)}
                  />
                  {/* Wings and Floors */}
                  {tower.wings?.map((wing, wIdx) => (
                    <FloorList key={wIdx} wing={wing} tIdx={tIdx} wIdx={wIdx} h={h} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {buildings.length > 0 && <StructureSummary buildings={buildings} />}

      {/* Delete confirmation (replaces window.confirm) */}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.actionLabel || "Delete"}
        tone="destructive"
        onConfirm={() => {
          confirmState?.onConfirm?.();
          setConfirmState(null);
        }}
      />
    </div>
  );
};

export default TowerHierarchyBuilder;
