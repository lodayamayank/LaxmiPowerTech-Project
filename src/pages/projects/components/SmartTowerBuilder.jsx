// src/pages/projects/components/SmartTowerBuilder.jsx
// Smart Tower Generator logic (moved unchanged; alert() became toast.error). Presets live in builder/generatorConstants.js,
// the generator dialog and unit-mix picker in builder/. The editable tree is TowerHierarchyBuilder.
import { useState } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/SectionCard";
import TowerHierarchyBuilder from "./TowerHierarchyBuilder";
import GeneratorDialog from "./builder/GeneratorDialog";
import { ROOM_TYPES, COMMERCIAL_UNIT_TYPES, COMMERCIAL_ROOM_LABELS, parsePositiveInt, parseNonNegativeInt, getResidentialFlatTypeDefaults, getCommercialMixEntries, getCommercialMixCount } from "./builder/generatorConstants";

const SmartTowerBuilder = ({ buildings, onChange }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Configuration state for smart generation
  const [towerConfig, setTowerConfig] = useState({
    towerName: '',
    buildingUse: 'residential',
    hasPodium: false,
    podiumCount: 1,
    hasCommonArea: false,
    commonAreaCount: 1,
    hasStaircase: false,
    staircaseCount: 1,
    basementType: 'none',
    customBasements: '',
    totalFloors: '',
    commercialFloors: 1,
    residentialFloors: '',
    commercialPreset: 'market_mix',
    commercialMix: { shop: 6, office: 3, cafeteria: 1, godown: 1, showroom: 1 },
    basementPreset: 'storage',
    basementMix: { shop: 0, office: 1, cafeteria: 0, godown: 4, showroom: 0 },
    defaultFlatsPerFloor: 4,
    ...getResidentialFlatTypeDefaults('2BHK')
  });

  const getFloorSuffix = (floorNumber) => {
    if (floorNumber % 100 >= 11 && floorNumber % 100 <= 13) return 'th';
    if (floorNumber % 10 === 1) return 'st';
    if (floorNumber % 10 === 2) return 'nd';
    if (floorNumber % 10 === 3) return 'rd';
    return 'th';
  };

  const getBasementCount = () => {
    if (towerConfig.basementType === 'b1') return 1;
    if (towerConfig.basementType === 'b1_b2') return 2;
    if (towerConfig.basementType === 'custom') return parseNonNegativeInt(towerConfig.customBasements, 0);
    return 0;
  };

  const createSupportAreas = () => {
    const podiums = [];
    const commonAreas = [];
    const staircases = [];

    if (towerConfig.hasPodium) {
      for (let p = 1; p <= parsePositiveInt(towerConfig.podiumCount, 1); p++) {
        podiums.push({ name: `P${p}`, description: 'Podium' });
      }
    }

    if (towerConfig.hasCommonArea) {
      for (let c = 1; c <= parsePositiveInt(towerConfig.commonAreaCount, 1); c++) {
        commonAreas.push({ name: `CA${c}`, description: 'Common Area' });
      }
    }

    if (towerConfig.hasStaircase) {
      for (let s = 1; s <= parsePositiveInt(towerConfig.staircaseCount, 1); s++) {
        staircases.push({ name: `Staircase ${s}`, type: 'Main Staircase' });
      }
    }

    return { podiums, commonAreas, staircases };
  };

  // Smart generation function for residential, commercial, and mixed-use towers.
  const generateTowerStructure = () => {
    const floors = [];
    const totalFloors = parseNonNegativeInt(towerConfig.totalFloors, 0);
    const commercialFloors = towerConfig.buildingUse === 'mixed'
      ? Math.min(parseNonNegativeInt(towerConfig.commercialFloors, 0), totalFloors)
      : totalFloors;
    const basementCount = getBasementCount();

    for (let b = basementCount; b >= 1; b--) {
      const useCommercialBasement = ['commercial', 'mixed'].includes(towerConfig.buildingUse);
      floors.push(useCommercialBasement
        ? createCommercialFloor(`B${b}`, -b, true, towerConfig.basementMix)
        : createResidentialFloor('B' + b, -b, true)
      );
    }

    if (towerConfig.buildingUse === 'commercial') {
      floors.push(createCommercialFloor('Ground Floor', 0, false, towerConfig.commercialMix));
      for (let f = 1; f <= totalFloors; f++) {
        floors.push(createCommercialFloor(`${f}${getFloorSuffix(f)} Floor`, f, false, towerConfig.commercialMix));
      }
    } else if (towerConfig.buildingUse === 'mixed') {
      floors.push(createCommercialFloor('Ground Floor', 0, false, towerConfig.commercialMix));
      for (let f = 1; f <= totalFloors; f++) {
        const floorName = `${f}${getFloorSuffix(f)} Floor`;
        floors.push(f <= commercialFloors
          ? createCommercialFloor(floorName, f, false, towerConfig.commercialMix)
          : createResidentialFloor(floorName, f, false)
        );
      }
    } else {
      floors.push(createResidentialFloor('Ground Floor', 0, false));
      for (let f = 1; f <= totalFloors; f++) {
        floors.push(createResidentialFloor(`${f}${getFloorSuffix(f)} Floor`, f, false));
      }
    }

    const { podiums, commonAreas, staircases } = createSupportAreas();

    return {
      name: towerConfig.towerName || `Tower ${String.fromCharCode(65 + buildings.length)}`,
      usageType: towerConfig.buildingUse,
      staircases,
      podiums,
      commonAreas,
      wings: [{
        name: 'Default',
        floors
      }]
    };
  };

  const createResidentialFloor = (name, floorNumber, isBasement) => {
    const { defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen } = towerConfig;
    return createFloor(name, floorNumber, isBasement, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen);
  };

  const createCommercialFloor = (name, floorNumber, isBasement, unitMix) => {
    const flats = [];
    const mixEntries = getCommercialMixEntries(unitMix);
    const unitsToCreate = mixEntries.length ? mixEntries : [{ ...COMMERCIAL_UNIT_TYPES[0], count: 1 }];
    let unitNumber = 1;

    unitsToCreate.forEach((unit) => {
      for (let i = 1; i <= unit.count; i++) {
        const flatNumber = floorNumber >= 0 ? `${floorNumber}C${unitNumber}` : `B${Math.abs(floorNumber)}C${unitNumber}`;
        flats.push({
          name: `${unit.label} ${i}`,
          flatNumber,
          flatType: unit.label,
          unitCategory: 'commercial',
          bedroomCount: 0,
          bathroomCount: unit.rooms.includes('washroom') ? 1 : 0,
          balconyCount: 0,
          hasLivingRoom: false,
          hasKitchen: unit.rooms.includes('kitchen') || unit.rooms.includes('pantry'),
          variation: isBasement ? 'Basement Commercial' : unit.label,
          rooms: unit.rooms.map((type) => ({
            name: COMMERCIAL_ROOM_LABELS[type] || type,
            type
          }))
        });
        unitNumber += 1;
      }
    });

    return {
      name,
      floorNumber,
      isBasement,
      usageType: 'commercial',
      flats
    };
  };

  const createFloor = (name, floorNumber, isBasement, flatsCount, flatType, roomTypes, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen) => {
    const flats = [];
    const safeFlatsCount = parsePositiveInt(flatsCount, 1);
    const safeBedroomCount = parseNonNegativeInt(bedroomCount, 0);
    const safeBathroomCount = parseNonNegativeInt(bathroomCount, 0);
    const safeBalconyCount = parseNonNegativeInt(balconyCount, 0);

    for (let i = 1; i <= safeFlatsCount; i++) {
      const flatNumber = floorNumber >= 0 ? `${floorNumber}0${i}` : `B${Math.abs(floorNumber)}0${i}`;

      // Generate rooms with proper numbering
      const rooms = [];

      // Add Living Room if enabled
      if (hasLivingRoom) {
        rooms.push({ name: 'Living Room / Hall', type: 'living_room' });
      }

      // Add numbered Bedrooms
      for (let b = 1; b <= safeBedroomCount; b++) {
        rooms.push({ name: `Bedroom ${b}`, type: 'bedroom' });
      }

      // Add Kitchen if enabled
      if (hasKitchen) {
        rooms.push({ name: 'Kitchen', type: 'kitchen' });
      }

      // Add numbered Bathrooms
      for (let b = 1; b <= safeBathroomCount; b++) {
        rooms.push({ name: `Bathroom ${b}`, type: 'bathroom' });
      }

      // Add numbered Balconies
      for (let b = 1; b <= safeBalconyCount; b++) {
        rooms.push({ name: `Balcony ${b}`, type: 'balcony' });
      }

      // Add any other selected room types from defaultRooms
      roomTypes.forEach(type => {
        if (!['living_room', 'bedroom', 'kitchen', 'bathroom', 'balcony'].includes(type)) {
          const roomDef = ROOM_TYPES.find(r => r.value === type);
          if (roomDef) {
            rooms.push({ name: roomDef.label, type: type });
          }
        }
      });

      flats.push({
        name: `Flat ${i}`,
        flatNumber: flatNumber,
        flatType: flatType,
        unitCategory: 'residential',
        bedroomCount: safeBedroomCount,
        bathroomCount: safeBathroomCount,
        balconyCount: safeBalconyCount,
        hasLivingRoom: hasLivingRoom !== false,
        hasKitchen: hasKitchen !== false,
        variation: 'Standard',
        rooms: rooms
      });
    }

    return {
      name,
      floorNumber,
      isBasement,
      usageType: 'residential',
      flats
    };
  };

  // Add tower with smart config
  const openTowerConfig = () => {
    setTowerConfig({
      towerName: `Tower ${String.fromCharCode(65 + buildings.length)}`,
      buildingUse: 'residential',
      hasPodium: false,
      podiumCount: 1,
      hasCommonArea: false,
      commonAreaCount: 1,
      hasStaircase: false,
      staircaseCount: 1,
      basementType: 'none',
      customBasements: '',
      totalFloors: '',
      commercialFloors: 1,
      residentialFloors: '',
      commercialPreset: 'market_mix',
      commercialMix: { shop: 6, office: 3, cafeteria: 1, godown: 1, showroom: 1 },
      basementPreset: 'storage',
      basementMix: { shop: 0, office: 1, cafeteria: 0, godown: 4, showroom: 0 },
      defaultFlatsPerFloor: 4,
      ...getResidentialFlatTypeDefaults('2BHK')
    });
    setShowConfigModal(true);
  };

  const saveGeneratedTower = () => {
    // Validate inputs
    const totalFloors = parseNonNegativeInt(towerConfig.totalFloors, 0);
    const customBasements = parseNonNegativeInt(towerConfig.customBasements, 0);

    if (totalFloors < 0) {
      toast.error('Please enter a valid number of floors');
      return;
    }

    if (towerConfig.basementType === 'custom' && customBasements <= 0) {
      toast.error('Please enter a valid number of basement levels');
      return;
    }

    if (towerConfig.buildingUse === 'mixed') {
      const commercialFloors = parseNonNegativeInt(towerConfig.commercialFloors, 0);
      if (commercialFloors < 0 || commercialFloors > totalFloors) {
        toast.error('Commercial floors must be between 0 and total floors');
        return;
      }
    }

    if (['commercial', 'mixed'].includes(towerConfig.buildingUse) && getCommercialMixCount(towerConfig.commercialMix) <= 0) {
      toast.error('Please add at least one commercial unit per commercial floor');
      return;
    }

    if (['commercial', 'mixed'].includes(towerConfig.buildingUse) && towerConfig.basementType !== 'none' && getCommercialMixCount(towerConfig.basementMix) <= 0) {
      toast.error('Please add at least one basement unit');
      return;
    }

    const newTower = generateTowerStructure();
    const newBuildings = [...buildings, newTower];
    onChange(newBuildings);
    setShowConfigModal(false);
  };

  const toggleRoom = (roomValue) => {
    setTowerConfig(prev => ({
      ...prev,
      defaultRooms: prev.defaultRooms.includes(roomValue)
        ? prev.defaultRooms.filter(r => r !== roomValue)
        : [...prev.defaultRooms, roomValue]
    }));
  };

  // Used by the shadcn Checkbox toggles (Radix passes true | false | 'indeterminate')
  const setConfigFlag = (field, checked) => {
    setTowerConfig((prev) => ({
      ...prev,
      [field]: checked === true
    }));
  };

  const handleNumberInputChange = (field, value) => {
    setTowerConfig((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResidentialFlatTypeChange = (flatType) => {
    setTowerConfig((prev) => ({
      ...prev,
      ...getResidentialFlatTypeDefaults(flatType)
    }));
  };

  const applyMixPreset = (presetField, mixField, preset) => {
    setTowerConfig((prev) => ({
      ...prev,
      [presetField]: preset.value,
      ...(preset.mix ? { [mixField]: { ...preset.mix } } : {})
    }));
  };

  const updateMixCount = (presetField, mixField, unitType, value) => {
    setTowerConfig((prev) => ({
      ...prev,
      [presetField]: 'custom',
      [mixField]: {
        ...prev[mixField],
        [unitType]: value
      }
    }));
  };

  const getPreviewCounts = () => {
    const totalUpperFloors = parseNonNegativeInt(towerConfig.totalFloors, 0);
    const basementCount = getBasementCount();
    const commercialUpperFloors = towerConfig.buildingUse === 'mixed'
      ? Math.min(parseNonNegativeInt(towerConfig.commercialFloors, 0), totalUpperFloors)
      : towerConfig.buildingUse === 'commercial'
        ? totalUpperFloors
        : 0;
    const residentialUpperFloors = towerConfig.buildingUse === 'mixed'
      ? Math.max(totalUpperFloors - commercialUpperFloors, 0)
      : towerConfig.buildingUse === 'residential'
        ? totalUpperFloors
        : 0;
    const commercialFloorsWithGround = ['commercial', 'mixed'].includes(towerConfig.buildingUse)
      ? commercialUpperFloors + 1
      : 0;
    const residentialFloorsWithGround = towerConfig.buildingUse === 'residential'
      ? residentialUpperFloors + 1
      : residentialUpperFloors;

    return {
      basementCount,
      totalFloors: basementCount + totalUpperFloors + 1,
      commercialUnits: (commercialFloorsWithGround * getCommercialMixCount(towerConfig.commercialMix))
        + (['commercial', 'mixed'].includes(towerConfig.buildingUse) ? basementCount * getCommercialMixCount(towerConfig.basementMix) : 0),
      residentialUnits: residentialFloorsWithGround * parseNonNegativeInt(towerConfig.defaultFlatsPerFloor, 0),
      commercialUpperFloors,
      residentialUpperFloors,
      commercialFloorsWithGround,
      residentialFloorsWithGround
    };
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Tower structure"
        description="Auto-generate complete tower structures in seconds, or build them by hand."
        actions={
          <Button type="button" onClick={openTowerConfig}>
            <Wand2 /> Smart Generate Tower
          </Button>
        }
        flush
      >
        <div className="p-5">
          {/* Tower Hierarchy Builder - Full Editable Structure */}
          <TowerHierarchyBuilder buildings={buildings} onChange={onChange} />
        </div>
      </SectionCard>

      <GeneratorDialog
        g={{
          open: showConfigModal, onClose: () => setShowConfigModal(false), towerConfig, setTowerConfig, setConfigFlag,
          handleNumberInputChange, handleResidentialFlatTypeChange, toggleRoom, getPreviewCounts, saveGeneratedTower,
          applyMixPreset, updateMixCount,
        }}
      />
    </div>
  );
};

export default SmartTowerBuilder;
