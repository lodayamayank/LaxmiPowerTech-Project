import React, { useState } from 'react';
import {
  FaBuilding,
  FaMagic,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import TowerHierarchyBuilder from './TowerHierarchyBuilder';

const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room', icon: '🛋️' },
  { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'bathroom', label: 'Bathroom', icon: '🚿' },
  { value: 'balcony', label: 'Balcony', icon: '🌿' },
  { value: 'utility', label: 'Utility/Store', icon: '🔧' },
  { value: 'dining', label: 'Dining Room', icon: '🍽️' },
  { value: 'study', label: 'Study Room', icon: '📚' },
  { value: 'pooja', label: 'Pooja Room', icon: '🙏' },
  { value: 'terrace', label: 'Terrace', icon: '🏠' },
];

const FLAT_TYPES = ['1RK', '1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Duplex', 'Custom'];

const BUILDING_USE_OPTIONS = [
  { value: 'residential', label: 'Residential', hint: 'Flats, bedrooms, kitchen, balconies' },
  { value: 'commercial', label: 'Commercial', hint: 'Offices, shops, cafeteria, godowns' },
  { value: 'mixed', label: 'Mixed Use', hint: 'Commercial below, residential above' }
];

const COMMERCIAL_UNIT_TYPES = [
  { value: 'shop', label: 'Shop', rooms: ['shop_floor', 'storage', 'washroom'] },
  { value: 'office', label: 'Office', rooms: ['workspace', 'cabin', 'pantry', 'washroom'] },
  { value: 'cafeteria', label: 'Cafeteria', rooms: ['dining_area', 'kitchen', 'counter', 'washroom'] },
  { value: 'godown', label: 'Godown', rooms: ['storage', 'loading_area', 'office', 'washroom'] },
  { value: 'showroom', label: 'Showroom', rooms: ['display_area', 'office', 'storage', 'washroom'] }
];

const COMMERCIAL_MIX_PRESETS = [
  { value: 'market_mix', label: 'Market Mix', hint: 'Shops, offices, cafeteria, godown, showroom', mix: { shop: 6, office: 3, cafeteria: 1, godown: 1, showroom: 1 } },
  { value: 'retail', label: 'Retail', hint: 'Mostly shops with one cafeteria', mix: { shop: 8, office: 1, cafeteria: 1, godown: 1, showroom: 1 } },
  { value: 'office', label: 'Office', hint: 'Offices with support spaces', mix: { shop: 1, office: 8, cafeteria: 1, godown: 1, showroom: 1 } },
  { value: 'custom', label: 'Custom', hint: 'Manually tune every unit count', mix: null }
];

const BASEMENT_MIX_PRESETS = [
  { value: 'storage', label: 'Storage', hint: 'Godowns with maintenance office', mix: { shop: 0, office: 1, cafeteria: 0, godown: 4, showroom: 0 } },
  { value: 'parking_support', label: 'Support', hint: 'Godown, office, cafeteria/store mix', mix: { shop: 0, office: 1, cafeteria: 1, godown: 2, showroom: 0 } },
  { value: 'custom', label: 'Custom', hint: 'Set basement unit counts yourself', mix: null }
];

const COMMERCIAL_ROOM_LABELS = {
  workspace: 'Workspace',
  cabin: 'Cabin',
  pantry: 'Pantry',
  washroom: 'Washroom',
  shop_floor: 'Shop Floor',
  storage: 'Storage',
  dining_area: 'Dining Area',
  kitchen: 'Kitchen',
  counter: 'Counter',
  loading_area: 'Loading Area',
  office: 'Office',
  display_area: 'Display Area'
};

const parsePositiveInt = (value, fallback = 1) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseNonNegativeInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getCommercialMixEntries = (mix) => {
  return COMMERCIAL_UNIT_TYPES
    .map((unit) => ({
      ...unit,
      count: parseNonNegativeInt(mix?.[unit.value], 0)
    }))
    .filter((unit) => unit.count > 0);
};

const getCommercialMixCount = (mix) => {
  return getCommercialMixEntries(mix).reduce((total, unit) => total + unit.count, 0);
};

const formatCommercialMix = (mix) => {
  const entries = getCommercialMixEntries(mix);
  if (!entries.length) return 'No commercial units';
  return entries.map((unit) => `${unit.count} ${unit.label}${unit.count > 1 ? 's' : ''}`).join(', ');
};

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
    defaultFlatType: '2BHK',
    bedroomCount: 2,
    bathroomCount: 2,
    balconyCount: 1,
    hasLivingRoom: true,
    hasKitchen: true,
    defaultRooms: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'balcony']
  });

  /*
   * Legacy residential-only generator kept for reference while the smart
   * generator is upgraded for residential, commercial, and mixed-use towers.
   *
   * const generateTowerStructureLegacy = () => {
   *   const { basementType, customBasements, totalFloors, defaultFlatsPerFloor, defaultFlatType, defaultRooms, towerName, hasPodium, podiumCount, hasCommonArea, commonAreaCount, hasStaircase, staircaseCount, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen } = towerConfig;
   *   const floors = [];
   *   const numBasements = parseInt(customBasements) || 0;
   *   const numFloors = parseInt(totalFloors) || 0;
   *   if (basementType === 'b1') floors.push(createResidentialFloor('B1', -1, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
   *   if (basementType === 'b1_b2') {
   *     floors.push(createResidentialFloor('B2', -2, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
   *     floors.push(createResidentialFloor('B1', -1, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
   *   }
   *   if (basementType === 'custom' && numBasements > 0) {
   *     for (let b = numBasements; b >= 1; b--) floors.push(createResidentialFloor(`B${b}`, -b, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
   *   }
   *   floors.push(createResidentialFloor('Ground Floor', 0, false, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
   *   for (let f = 1; f <= numFloors; f++) floors.push(createResidentialFloor(`${f}${getFloorSuffix(f)} Floor`, f, false, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
   *   return { name: towerName || `Tower ${String.fromCharCode(65 + buildings.length)}`, staircases: [], podiums: [], commonAreas: [], wings: [{ name: 'Default', floors }] };
   * };
   */

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
      defaultFlatType: '2BHK',
      bedroomCount: 2,
      bathroomCount: 2,
      balconyCount: 1,
      hasLivingRoom: true,
      hasKitchen: true,
      defaultRooms: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'balcony']
    });
    setShowConfigModal(true);
  };

  const saveGeneratedTower = () => {
    // Validate inputs
    const totalFloors = parseNonNegativeInt(towerConfig.totalFloors, 0);
    const customBasements = parseNonNegativeInt(towerConfig.customBasements, 0);

    if (totalFloors < 0) {
      alert('Please enter a valid number of floors');
      return;
    }

    if (towerConfig.basementType === 'custom' && customBasements <= 0) {
      alert('Please enter a valid number of basement levels');
      return;
    }

    if (towerConfig.buildingUse === 'mixed') {
      const commercialFloors = parseNonNegativeInt(towerConfig.commercialFloors, 0);
      if (commercialFloors < 0 || commercialFloors > totalFloors) {
        alert('Commercial floors must be between 0 and total floors');
        return;
      }
    }

    if (['commercial', 'mixed'].includes(towerConfig.buildingUse) && getCommercialMixCount(towerConfig.commercialMix) <= 0) {
      alert('Please add at least one commercial unit per commercial floor');
      return;
    }

    if (['commercial', 'mixed'].includes(towerConfig.buildingUse) && towerConfig.basementType !== 'none' && getCommercialMixCount(towerConfig.basementMix) <= 0) {
      alert('Please add at least one basement unit');
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

  const handleNumberInputChange = (field, value) => {
    setTowerConfig((prev) => ({
      ...prev,
      [field]: value
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

  const renderMixControls = ({ title, subtitle, presetField, mixField, presets }) => {
    const selectedPreset = towerConfig[presetField];
    const mix = towerConfig[mixField];

    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-700">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => applyMixPreset(presetField, mixField, preset)}
              className={`rounded-lg border-2 px-3 py-2 text-left transition-all ${
                selectedPreset === preset.value
                  ? 'border-slate-600 bg-white text-slate-900 shadow-sm'
                  : 'border-slate-200 bg-white text-gray-700 hover:border-slate-400'
              }`}
            >
              <span className="block text-sm font-bold">{preset.label}</span>
              <span className="block text-[11px] text-gray-500">{preset.hint}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {COMMERCIAL_UNIT_TYPES.map((unit) => (
            <label key={unit.value} className="rounded-lg border border-slate-200 bg-white p-3">
              <span className="block text-xs font-semibold text-gray-600">{unit.label}</span>
              <input
                type="number"
                min="0"
                max="50"
                value={mix?.[unit.value] ?? ''}
                onChange={(e) => updateMixCount(presetField, mixField, unit.value, e.target.value)}
                className="mt-2 w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200 font-semibold"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-600">
          Will generate per floor: <strong>{formatCommercialMix(mix)}</strong>
        </p>
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FaBuilding className="text-orange-600" />
            Smart Tower Builder
          </h3>
          <p className="text-xs text-gray-500 mt-1">Auto-generate complete tower structures in seconds</p>
        </div>
        <button
          type="button"
          onClick={openTowerConfig}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg text-sm font-medium"
        >
          <FaMagic /> Smart Generate Tower
        </button>
      </div>

      {/* Tower Hierarchy Builder - Full Editable Structure */}
      <TowerHierarchyBuilder 
        buildings={buildings}
        onChange={onChange}
      />

      {/* Project Summary */}
      {buildings.length > 0 && (
        <div className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-md">
          <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-xl">📊</span> Project Summary
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-200">
              <p className="text-xs text-gray-500 mb-1">Total Towers</p>
              <p className="text-3xl font-bold text-orange-600">{buildings.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
              <p className="text-xs text-gray-500 mb-1">Total Floors</p>
              <p className="text-3xl font-bold text-blue-600">
                {buildings.reduce((sum, t) => sum + (t.wings?.[0]?.floors?.length || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
              <p className="text-xs text-gray-500 mb-1">Total Units</p>
              <p className="text-3xl font-bold text-green-600">
                {buildings.reduce((sum, t) => 
                  sum + (t.wings?.[0]?.floors?.reduce((fSum, f) => fSum + (f.flats?.length || 0), 0) || 0), 0
                )}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-300">
              <p className="text-xs text-gray-500 mb-1">Basements</p>
              <p className="text-3xl font-bold text-gray-600">
                {buildings.reduce((sum, t) => 
                  sum + (t.wings?.[0]?.floors?.filter(f => f.isBasement)?.length || 0), 0
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Smart Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaMagic className="text-white text-2xl" />
                  <h3 className="text-xl font-bold text-white">Smart Tower Generator</h3>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <p className="text-white/90 text-sm mt-2">Configure once and generate complete structure automatically</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Tower Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tower Name
                </label>
                <input
                  type="text"
                  value={towerConfig.towerName}
                  onChange={(e) => setTowerConfig({ ...towerConfig, towerName: e.target.value })}
                  placeholder="e.g., Tower A, Sunrise Block"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Building Usage
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {BUILDING_USE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTowerConfig({ ...towerConfig, buildingUse: option.value })}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        towerConfig.buildingUse === option.value
                          ? 'border-orange-500 bg-orange-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <span className="block font-bold text-gray-900">{option.label}</span>
                      <span className="mt-1 block text-xs text-gray-500">{option.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Podium Configuration */}
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={towerConfig.hasPodium}
                    onChange={(e) => setTowerConfig({ ...towerConfig, hasPodium: e.target.checked })}
                    className="w-5 h-5 text-yellow-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    🏛️ Does this tower have Podium?
                  </span>
                </label>
                {towerConfig.hasPodium && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Number of Podiums</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={towerConfig.podiumCount}
                      onChange={(e) => setTowerConfig({ ...towerConfig, podiumCount: e.target.value })}
                      placeholder="Enter number (e.g., 1, 2, 3)"
                      className="w-full px-4 py-2 border-2 border-yellow-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">Will generate: P1, P2, P3...</p>
                  </div>
                )}
              </div>

              {/* Common Area Configuration */}
              <div className="p-4 bg-cyan-50 border-2 border-cyan-200 rounded-lg">
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={towerConfig.hasCommonArea}
                    onChange={(e) => setTowerConfig({ ...towerConfig, hasCommonArea: e.target.checked })}
                    className="w-5 h-5 text-cyan-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    🏢 Does this tower have Common Areas?
                  </span>
                </label>
                {towerConfig.hasCommonArea && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Number of Common Areas</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={towerConfig.commonAreaCount}
                      onChange={(e) => setTowerConfig({ ...towerConfig, commonAreaCount: e.target.value })}
                      placeholder="Enter number (e.g., 1, 2, 3)"
                      className="w-full px-4 py-2 border-2 border-cyan-300 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">Will generate: CA1, CA2, CA3... (Gym, Pool, etc.)</p>
                  </div>
                )}
              </div>

              {/* Staircase Configuration */}
              <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={towerConfig.hasStaircase}
                    onChange={(e) => setTowerConfig({ ...towerConfig, hasStaircase: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    🪜 Does this tower have Staircases?
                  </span>
                </label>
                {towerConfig.hasStaircase && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Number of Staircases</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={towerConfig.staircaseCount}
                      onChange={(e) => setTowerConfig({ ...towerConfig, staircaseCount: e.target.value })}
                      placeholder="Enter number (e.g., 1, 2, 3)"
                      className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                    <p className="text-xs text-gray-500 mt-1">Will generate: Staircase 1, Staircase 2, Staircase 3...</p>
                  </div>
                )}
              </div>

              {/* Basement Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🅱️ Basement Configuration
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'none', label: 'No Basement' },
                    { value: 'b1', label: 'B1' },
                    { value: 'b1_b2', label: 'B1 + B2' },
                    { value: 'custom', label: 'Custom' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTowerConfig({ ...towerConfig, basementType: option.value })}
                      className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                        towerConfig.basementType === option.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {towerConfig.basementType === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={towerConfig.customBasements}
                    onChange={(e) => setTowerConfig({ ...towerConfig, customBasements: e.target.value })}
                    placeholder="Number of basement levels"
                    className="mt-3 w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                )}
              </div>

              {/* Total Floors */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏢 Total Floors Above Ground
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={towerConfig.totalFloors}
                  onChange={(e) => setTowerConfig({ ...towerConfig, totalFloors: e.target.value })}
                  placeholder="Enter floors above ground (e.g., 0, 10, 20, 40)"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">System will auto-generate: Ground Floor + {towerConfig.totalFloors || 0} upper floors</p>
              </div>

              {['commercial', 'mixed'].includes(towerConfig.buildingUse) && (
                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">Commercial Configuration</h4>
                  {towerConfig.buildingUse === 'mixed' && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">Commercial Floors Above Ground</label>
	                      <input
	                        type="number"
	                        min="0"
	                        max={parseNonNegativeInt(towerConfig.totalFloors, 0)}
	                        value={towerConfig.commercialFloors}
	                        onChange={(e) => handleNumberInputChange('commercialFloors', e.target.value)}
	                        placeholder="e.g., 1 for 1st floor commercial"
	                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
	                      />
                      <p className="text-xs text-gray-500 mt-1">Ground floor is commercial by default; upper floors after this count become residential.</p>
                    </div>
                  )}
	                  {renderMixControls({
	                    title: 'Commercial Floor Mix',
	                    subtitle: 'Pick a preset, then adjust only the small changes you need.',
	                    presetField: 'commercialPreset',
	                    mixField: 'commercialMix',
	                    presets: COMMERCIAL_MIX_PRESETS
	                  })}
	                  {towerConfig.basementType !== 'none' && (
	                    <div className="pt-4 border-t border-slate-200">
	                      {renderMixControls({
	                        title: 'Basement Unit Mix',
	                        subtitle: 'Use this when basement has godowns, offices, stores, or support rooms.',
	                        presetField: 'basementPreset',
	                        mixField: 'basementMix',
	                        presets: BASEMENT_MIX_PRESETS
	                      })}
	                    </div>
	                  )}
	                </div>
	              )}

              {/* Default Flats per Floor */}
              {towerConfig.buildingUse !== 'commercial' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚪 Residential Flats Per Floor
                </label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 6, 8].map(num => (
                    <button
                      key={num}
	                      type="button"
	                      onClick={() => setTowerConfig({ ...towerConfig, defaultFlatsPerFloor: num })}
	                      className={`px-4 py-3 rounded-lg border-2 transition-all font-bold text-lg ${
	                        parsePositiveInt(towerConfig.defaultFlatsPerFloor, 1) === num
	                          ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
	                          : 'border-gray-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50 hover:shadow-sm'
	                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
	                  min="1"
	                  max="50"
	                  value={towerConfig.defaultFlatsPerFloor}
	                  onChange={(e) => handleNumberInputChange('defaultFlatsPerFloor', e.target.value)}
	                  placeholder="Or enter custom number (e.g., 5, 7, 10)"
	                  className="mt-2 w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 font-semibold text-lg"
	                />
              </div>
              )}

              {/* Default Flat Type */}
              {towerConfig.buildingUse !== 'commercial' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏠 Residential Flat Type
                </label>
                <select
                  value={towerConfig.defaultFlatType}
                  onChange={(e) => setTowerConfig({ ...towerConfig, defaultFlatType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-medium"
                >
                  {FLAT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              )}

              {/* Bedroom & Bathroom Configuration */}
              {towerConfig.buildingUse !== 'commercial' && (
              <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">🛏️ Room Configuration</h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Bedrooms</label>
                    <input
                      type="number"
	                      min="0"
	                      max="10"
	                      value={towerConfig.bedroomCount}
	                      onChange={(e) => handleNumberInputChange('bedroomCount', e.target.value)}
	                      className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-semibold"
	                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Bathrooms</label>
                    <input
                      type="number"
	                      min="0"
	                      max="10"
	                      value={towerConfig.bathroomCount}
	                      onChange={(e) => handleNumberInputChange('bathroomCount', e.target.value)}
	                      className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-semibold"
	                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Balconies</label>
                    <input
                      type="number"
	                      min="0"
	                      max="10"
	                      value={towerConfig.balconyCount}
	                      onChange={(e) => handleNumberInputChange('balconyCount', e.target.value)}
	                      className="w-full px-4 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-semibold"
	                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={towerConfig.hasLivingRoom}
                      onChange={(e) => setTowerConfig({ ...towerConfig, hasLivingRoom: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>Living Room / Hall</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={towerConfig.hasKitchen}
                      onChange={(e) => setTowerConfig({ ...towerConfig, hasKitchen: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>Kitchen</span>
                  </label>
                </div>
                <div className="mt-3 p-2 bg-white rounded border border-indigo-200">
                  <p className="text-xs text-gray-600">
                    <strong>Will generate:</strong> 
                    {towerConfig.hasLivingRoom && ' Living Room/Hall,'}
	                    {parseNonNegativeInt(towerConfig.bedroomCount, 0) > 0 && ` Bedroom 1-${towerConfig.bedroomCount},`}
	                    {towerConfig.hasKitchen && ' Kitchen,'}
	                    {parseNonNegativeInt(towerConfig.bathroomCount, 0) > 0 && ` Bathroom 1-${towerConfig.bathroomCount},`}
	                    {parseNonNegativeInt(towerConfig.balconyCount, 0) > 0 && ` Balcony 1-${towerConfig.balconyCount}`}
                  </p>
                </div>
              </div>
              )}

              {/* Additional Room Types (Optional) */}
              {towerConfig.buildingUse !== 'commercial' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🏠 Additional Room Types (Optional - for special rooms)
                </label>
                <p className="text-xs text-gray-500 mb-3">Select additional rooms like Dining, Study, Pooja Room, Terrace, etc.</p>
                <div className="grid grid-cols-2 gap-3">
                  {ROOM_TYPES.map(room => (
                    <label
                      key={room.value}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        towerConfig.defaultRooms.includes(room.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={towerConfig.defaultRooms.includes(room.value)}
                        onChange={() => toggleRoom(room.value)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-2xl">{room.icon}</span>
                      <span className="font-medium text-gray-700">{room.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Selected: {towerConfig.defaultRooms.length} room types
                </p>
              </div>
              )}

              {/* Preview */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">✨ Preview:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Usage: {BUILDING_USE_OPTIONS.find((option) => option.value === towerConfig.buildingUse)?.label}</li>
                  {towerConfig.hasPodium && <li>• 🏛️ Podiums: {towerConfig.podiumCount || 1} (P1, P2, P3...)</li>}
                  {towerConfig.hasCommonArea && <li>• 🏢 Common Areas: {towerConfig.commonAreaCount || 1} (CA1, CA2, CA3...)</li>}
                  {towerConfig.hasStaircase && <li>• 🪜 Staircases: {towerConfig.staircaseCount || 1} (Staircase 1, Staircase 2...)</li>}
                  <li>• {towerConfig.basementType !== 'none' ? `Basements: ${towerConfig.basementType === 'custom' ? (towerConfig.customBasements || 0) : towerConfig.basementType === 'b1_b2' ? '2 (B2, B1)' : '1 (B1)'}` : 'No basements'}</li>
	                  <li>• Floors: Ground Floor + {towerConfig.totalFloors || 0} upper floors + {getPreviewCounts().basementCount} basements = {getPreviewCounts().totalFloors} total</li>
	                  {['commercial', 'mixed'].includes(towerConfig.buildingUse) && (
	                    <li>• Commercial: {getPreviewCounts().commercialFloorsWithGround} floor(s), {formatCommercialMix(towerConfig.commercialMix)} per commercial floor</li>
	                  )}
	                  {['commercial', 'mixed'].includes(towerConfig.buildingUse) && towerConfig.basementType !== 'none' && (
	                    <li>• Basement: {formatCommercialMix(towerConfig.basementMix)} per basement level</li>
	                  )}
	                  {towerConfig.buildingUse !== 'commercial' && (
	                    <li>• Residential: {getPreviewCounts().residentialFloorsWithGround} floor(s), {towerConfig.defaultFlatsPerFloor} flat(s) per residential floor</li>
	                  )}
	                  <li>• Total units: {getPreviewCounts().commercialUnits + getPreviewCounts().residentialUnits}</li>
	                  {towerConfig.buildingUse !== 'commercial' && (
	                    <li>• Rooms per residential flat: {parseNonNegativeInt(towerConfig.bedroomCount, 0)} Bedrooms, {parseNonNegativeInt(towerConfig.bathroomCount, 0)} Bathrooms, {parseNonNegativeInt(towerConfig.balconyCount, 0)} Balconies + {(towerConfig.hasLivingRoom ? 1 : 0) + (towerConfig.hasKitchen ? 1 : 0)} other rooms</li>
	                  )}
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-gray-50 border-t flex gap-3 sticky bottom-0">
              <button
                onClick={saveGeneratedTower}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <FaCheck /> Generate Tower
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SmartTowerBuilder;
