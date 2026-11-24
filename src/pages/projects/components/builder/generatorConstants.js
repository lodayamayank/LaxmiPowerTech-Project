// src/pages/projects/components/builder/generatorConstants.js
// Presets and helpers of the Smart Tower Generator (moved unchanged from SmartTowerBuilder.jsx).

export const ROOM_TYPES = [
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

export const FLAT_TYPES = ['1RK', '1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Duplex', 'Custom'];

export const RESIDENTIAL_FLAT_TYPE_PRESETS = {
  '1RK': {
    bedroomCount: 0,
    bathroomCount: 1,
    balconyCount: 0,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: []
  },
  '1BHK': {
    bedroomCount: 1,
    bathroomCount: 1,
    balconyCount: 1,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: []
  },
  '2BHK': {
    bedroomCount: 2,
    bathroomCount: 2,
    balconyCount: 1,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: []
  },
  '3BHK': {
    bedroomCount: 3,
    bathroomCount: 3,
    balconyCount: 2,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: ['dining']
  },
  '4BHK': {
    bedroomCount: 4,
    bathroomCount: 4,
    balconyCount: 2,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: ['dining', 'utility']
  },
  Studio: {
    bedroomCount: 0,
    bathroomCount: 1,
    balconyCount: 0,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: []
  },
  Penthouse: {
    bedroomCount: 4,
    bathroomCount: 4,
    balconyCount: 3,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: ['dining', 'study', 'pooja', 'terrace', 'utility']
  },
  Duplex: {
    bedroomCount: 3,
    bathroomCount: 3,
    balconyCount: 2,
    hasLivingRoom: true,
    hasKitchen: true,
    additionalRooms: ['dining', 'study', 'utility']
  }
};

export const BUILDING_USE_OPTIONS = [
  { value: 'residential', label: 'Residential', hint: 'Flats, bedrooms, kitchen, balconies' },
  { value: 'commercial', label: 'Commercial', hint: 'Offices, shops, cafeteria, godowns' },
  { value: 'mixed', label: 'Mixed Use', hint: 'Commercial below, residential above' }
];

export const COMMERCIAL_UNIT_TYPES = [
  { value: 'shop', label: 'Shop', rooms: ['shop_floor', 'storage', 'washroom'] },
  { value: 'office', label: 'Office', rooms: ['workspace', 'cabin', 'pantry', 'washroom'] },
  { value: 'cafeteria', label: 'Cafeteria', rooms: ['dining_area', 'kitchen', 'counter', 'washroom'] },
  { value: 'godown', label: 'Godown', rooms: ['storage', 'loading_area', 'office', 'washroom'] },
  { value: 'showroom', label: 'Showroom', rooms: ['display_area', 'office', 'storage', 'washroom'] }
];

export const COMMERCIAL_MIX_PRESETS = [
  { value: 'market_mix', label: 'Market Mix', hint: 'Shops, offices, cafeteria, godown, showroom', mix: { shop: 6, office: 3, cafeteria: 1, godown: 1, showroom: 1 } },
  { value: 'retail', label: 'Retail', hint: 'Mostly shops with one cafeteria', mix: { shop: 8, office: 1, cafeteria: 1, godown: 1, showroom: 1 } },
  { value: 'office', label: 'Office', hint: 'Offices with support spaces', mix: { shop: 1, office: 8, cafeteria: 1, godown: 1, showroom: 1 } },
  { value: 'custom', label: 'Custom', hint: 'Manually tune every unit count', mix: null }
];

export const BASEMENT_MIX_PRESETS = [
  { value: 'storage', label: 'Storage', hint: 'Godowns with maintenance office', mix: { shop: 0, office: 1, cafeteria: 0, godown: 4, showroom: 0 } },
  { value: 'parking_support', label: 'Support', hint: 'Godown, office, cafeteria/store mix', mix: { shop: 0, office: 1, cafeteria: 1, godown: 2, showroom: 0 } },
  { value: 'custom', label: 'Custom', hint: 'Set basement unit counts yourself', mix: null }
];

export const COMMERCIAL_ROOM_LABELS = {
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

export const parsePositiveInt = (value, fallback = 1) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseNonNegativeInt = (value, fallback = 0) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getResidentialDefaultRooms = (preset) => {
  const rooms = [];

  if (preset.hasLivingRoom) rooms.push('living_room');
  if (parseNonNegativeInt(preset.bedroomCount, 0) > 0) rooms.push('bedroom');
  if (preset.hasKitchen) rooms.push('kitchen');
  if (parseNonNegativeInt(preset.bathroomCount, 0) > 0) rooms.push('bathroom');
  if (parseNonNegativeInt(preset.balconyCount, 0) > 0) rooms.push('balcony');

  return Array.from(new Set([...rooms, ...(preset.additionalRooms || [])]));
};

export const getResidentialFlatTypeDefaults = (flatType) => {
  const preset = RESIDENTIAL_FLAT_TYPE_PRESETS[flatType];

  if (!preset) {
    return { defaultFlatType: flatType };
  }

  return {
    defaultFlatType: flatType,
    bedroomCount: preset.bedroomCount,
    bathroomCount: preset.bathroomCount,
    balconyCount: preset.balconyCount,
    hasLivingRoom: preset.hasLivingRoom,
    hasKitchen: preset.hasKitchen,
    defaultRooms: getResidentialDefaultRooms(preset)
  };
};

export const getCommercialMixEntries = (mix) => {
  return COMMERCIAL_UNIT_TYPES
    .map((unit) => ({
      ...unit,
      count: parseNonNegativeInt(mix?.[unit.value], 0)
    }))
    .filter((unit) => unit.count > 0);
};

export const getCommercialMixCount = (mix) => {
  return getCommercialMixEntries(mix).reduce((total, unit) => total + unit.count, 0);
};

export const formatCommercialMix = (mix) => {
  const entries = getCommercialMixEntries(mix);
  if (!entries.length) return 'No commercial units';
  return entries.map((unit) => `${unit.count} ${unit.label}${unit.count > 1 ? 's' : ''}`).join(', ');
};
