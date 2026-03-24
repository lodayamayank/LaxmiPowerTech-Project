import React, { useState } from 'react';
import { 
  FaPlus, 
  FaTrash, 
  FaChevronDown, 
  FaChevronRight, 
  FaCopy,
  FaBuilding,
  FaMagic,
  FaEdit,
  FaCheck,
  FaTimes,
  FaLayerGroup
} from 'react-icons/fa';
import WingManagementModal from './WingManagementModal';
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

const SmartTowerBuilder = ({ buildings, onChange }) => {
  const [expandedTowers, setExpandedTowers] = useState({});
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentTowerIdx, setCurrentTowerIdx] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideFloorIdx, setOverrideFloorIdx] = useState(null);
  const [showWingModal, setShowWingModal] = useState(false);
  const [selectedWingTower, setSelectedWingTower] = useState(null);

  // Configuration state for smart generation
  const [towerConfig, setTowerConfig] = useState({
    towerName: '',
    hasPodium: false,
    podiumCount: 1,
    hasCommonArea: false,
    commonAreaCount: 1,
    hasStaircase: false,
    staircaseCount: 1,
    basementType: 'none',
    customBasements: '',
    totalFloors: '',
    defaultFlatsPerFloor: 4,
    defaultFlatType: '2BHK',
    bedroomCount: 2,
    bathroomCount: 2,
    balconyCount: 1,
    hasLivingRoom: true,
    hasKitchen: true,
    defaultRooms: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'balcony']
  });

  const toggleTower = (towerIdx) => {
    setExpandedTowers(prev => ({ ...prev, [towerIdx]: !prev[towerIdx] }));
  };

  // Smart generation function
  const generateTowerStructure = () => {
    const { basementType, customBasements, totalFloors, defaultFlatsPerFloor, defaultFlatType, defaultRooms, towerName, hasPodium, podiumCount, hasCommonArea, commonAreaCount, hasStaircase, staircaseCount, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen } = towerConfig;
    
    const floors = [];
    const numBasements = parseInt(customBasements) || 0;
    const numFloors = parseInt(totalFloors) || 0;
    
    // Generate basements
    if (basementType === 'b1') {
      floors.push(createFloor('B1', -1, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
    } else if (basementType === 'b1_b2') {
      floors.push(createFloor('B2', -2, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
      floors.push(createFloor('B1', -1, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
    } else if (basementType === 'custom' && numBasements > 0) {
      for (let b = numBasements; b >= 1; b--) {
        floors.push(createFloor(`B${b}`, -b, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
      }
    }
    
    // Generate Ground Floor
    floors.push(createFloor('Ground Floor', 0, false, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
    
    // Generate regular floors
    for (let f = 1; f <= numFloors; f++) {
      const suffix = f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th';
      floors.push(createFloor(`${f}${suffix} Floor`, f, false, defaultFlatsPerFloor, defaultFlatType, defaultRooms, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen));
    }
    
    // Generate Podiums
    const podiums = [];
    if (hasPodium) {
      for (let p = 1; p <= (parseInt(podiumCount) || 1); p++) {
        podiums.push({ name: `P${p}`, description: '' });
      }
    }
    
    // Generate Common Areas
    const commonAreas = [];
    if (hasCommonArea) {
      for (let c = 1; c <= (parseInt(commonAreaCount) || 1); c++) {
        commonAreas.push({ name: `CA${c}`, description: '' });
      }
    }
    
    // Generate Staircases
    const staircases = [];
    if (hasStaircase) {
      for (let s = 1; s <= (parseInt(staircaseCount) || 1); s++) {
        staircases.push({ name: `Staircase ${s}`, type: 'Main Staircase' });
      }
    }
    
    return {
      name: towerName || `Tower ${String.fromCharCode(65 + buildings.length)}`,
      staircases: staircases,
      podiums: podiums,
      commonAreas: commonAreas,
      wings: [{
        name: 'Default',
        floors: floors
      }]
    };
  };

  const createFloor = (name, floorNumber, isBasement, flatsCount, flatType, roomTypes, bedroomCount, bathroomCount, balconyCount, hasLivingRoom, hasKitchen) => {
    const flats = [];
    for (let i = 1; i <= flatsCount; i++) {
      const flatNumber = floorNumber >= 0 ? `${floorNumber}0${i}` : `B${Math.abs(floorNumber)}0${i}`;
      
      // Generate rooms with proper numbering
      const rooms = [];
      
      // Add Living Room if enabled
      if (hasLivingRoom) {
        rooms.push({ name: 'Living Room / Hall', type: 'living_room' });
      }
      
      // Add numbered Bedrooms
      for (let b = 1; b <= (bedroomCount || 0); b++) {
        rooms.push({ name: `Bedroom ${b}`, type: 'bedroom' });
      }
      
      // Add Kitchen if enabled
      if (hasKitchen) {
        rooms.push({ name: 'Kitchen', type: 'kitchen' });
      }
      
      // Add numbered Bathrooms
      for (let b = 1; b <= (bathroomCount || 0); b++) {
        rooms.push({ name: `Bathroom ${b}`, type: 'bathroom' });
      }
      
      // Add numbered Balconies
      for (let b = 1; b <= (balconyCount || 0); b++) {
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
        bedroomCount: bedroomCount || 2,
        bathroomCount: bathroomCount || 2,
        balconyCount: balconyCount || 1,
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
      flats
    };
  };

  // Add tower with smart config
  const openTowerConfig = () => {
    setCurrentTowerIdx(null);
    setTowerConfig({
      towerName: `Tower ${String.fromCharCode(65 + buildings.length)}`,
      hasPodium: false,
      podiumCount: 1,
      hasCommonArea: false,
      commonAreaCount: 1,
      hasStaircase: false,
      staircaseCount: 1,
      basementType: 'none',
      customBasements: '',
      totalFloors: '',
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
    const totalFloors = parseInt(towerConfig.totalFloors) || 0;
    const customBasements = parseInt(towerConfig.customBasements) || 0;

    if (totalFloors <= 0) {
      alert('Please enter a valid number of floors (minimum 1)');
      return;
    }

    if (towerConfig.basementType === 'custom' && customBasements <= 0) {
      alert('Please enter a valid number of basement levels');
      return;
    }

    const newTower = generateTowerStructure();
    const newBuildings = [...buildings, newTower];
    onChange(newBuildings);
    setShowConfigModal(false);
    setExpandedTowers(prev => ({ ...prev, [buildings.length]: true }));
  };

  const deleteTower = (towerIdx) => {
    if (window.confirm('Delete this entire tower? This action cannot be undone.')) {
      const newBuildings = buildings.filter((_, i) => i !== towerIdx);
      onChange(newBuildings);
    }
  };

  const copyTower = (towerIdx) => {
    const newBuildings = [...buildings];
    const copiedTower = JSON.parse(JSON.stringify(buildings[towerIdx]));
    copiedTower.name = `${copiedTower.name} (Copy)`;
    newBuildings.push(copiedTower);
    onChange(newBuildings);
    setExpandedTowers(prev => ({ ...prev, [newBuildings.length - 1]: true }));
  };

  const updateTowerName = (towerIdx, name) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].name = name;
    onChange(newBuildings);
  };

  const openWingManagement = (towerIdx) => {
    setSelectedWingTower(towerIdx);
    setShowWingModal(true);
  };

  const saveWingChanges = (updatedTower) => {
    const newBuildings = [...buildings];
    newBuildings[selectedWingTower] = updatedTower;
    onChange(newBuildings);
    setShowWingModal(false);
  };

  // Delete specific floor
  const deleteFloor = (towerIdx, wingIdx, floorIdx) => {
    if (window.confirm('Delete this floor? This action cannot be undone.')) {
      const newBuildings = [...buildings];
      newBuildings[towerIdx].wings[wingIdx].floors.splice(floorIdx, 1);
      onChange(newBuildings);
    }
  };

  // Override specific floor
  const openFloorOverride = (towerIdx, wingIdx, floorIdx) => {
    setCurrentTowerIdx(towerIdx);
    setOverrideFloorIdx({ wingIdx, floorIdx });
    const floor = buildings[towerIdx].wings[wingIdx].floors[floorIdx];
    setTowerConfig({
      ...towerConfig,
      defaultFlatsPerFloor: floor.flats?.length || 4,
      defaultFlatType: floor.flats?.[0]?.flatType || '2BHK',
      defaultRooms: floor.flats?.[0]?.rooms?.map(r => r.type) || []
    });
    setShowOverrideModal(true);
  };

  const saveFloorOverride = () => {
    const { defaultFlatsPerFloor, defaultFlatType, defaultRooms } = towerConfig;
    const newBuildings = [...buildings];
    const { wingIdx, floorIdx } = overrideFloorIdx;
    const floor = newBuildings[currentTowerIdx].wings[wingIdx].floors[floorIdx];
    
    // Regenerate flats for this floor
    floor.flats = [];
    for (let i = 1; i <= defaultFlatsPerFloor; i++) {
      const flatNumber = floor.floorNumber >= 0 ? `${floor.floorNumber}0${i}` : `B${Math.abs(floor.floorNumber)}0${i}`;
      floor.flats.push({
        name: `Flat ${i}`,
        flatNumber: flatNumber,
        flatType: defaultFlatType,
        rooms: defaultRooms.map(type => {
          const roomDef = ROOM_TYPES.find(r => r.value === type);
          return { name: roomDef.label, type: type };
        })
      });
    }
    
    onChange(newBuildings);
    setShowOverrideModal(false);
  };

  const toggleRoom = (roomValue) => {
    setTowerConfig(prev => ({
      ...prev,
      defaultRooms: prev.defaultRooms.includes(roomValue)
        ? prev.defaultRooms.filter(r => r !== roomValue)
        : [...prev.defaultRooms, roomValue]
    }));
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
              <p className="text-xs text-gray-500 mb-1">Total Flats</p>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-300 hover:border-orange-300'
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
                  🏢 Total Floors (excluding Ground Floor)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={towerConfig.totalFloors}
                  onChange={(e) => setTowerConfig({ ...towerConfig, totalFloors: e.target.value })}
                  placeholder="Enter number of floors (e.g., 10, 20, 40)"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-lg font-semibold"
                />
                <p className="text-xs text-gray-500 mt-2">System will auto-generate: Ground Floor + {towerConfig.totalFloors || 0} floors</p>
              </div>

              {/* Default Flats per Floor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🚪 Default Flats Per Floor
                </label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 6, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTowerConfig({ ...towerConfig, defaultFlatsPerFloor: num })}
                      className={`px-4 py-3 rounded-lg border-2 transition-all font-bold text-lg ${
                        towerConfig.defaultFlatsPerFloor === num
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-green-300'
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
                  onChange={(e) => setTowerConfig({ ...towerConfig, defaultFlatsPerFloor: parseInt(e.target.value) || 1 })}
                  placeholder="Or enter custom number (e.g., 5, 7, 10)"
                  className="mt-2 w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 font-semibold text-lg"
                />
              </div>

              {/* Default Flat Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🏠 Default Flat Type
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

              {/* Bedroom & Bathroom Configuration */}
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
                      onChange={(e) => setTowerConfig({ ...towerConfig, bedroomCount: parseInt(e.target.value) || 0 })}
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
                      onChange={(e) => setTowerConfig({ ...towerConfig, bathroomCount: parseInt(e.target.value) || 0 })}
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
                      onChange={(e) => setTowerConfig({ ...towerConfig, balconyCount: parseInt(e.target.value) || 0 })}
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
                    {towerConfig.bedroomCount > 0 && ` Bedroom 1-${towerConfig.bedroomCount},`}
                    {towerConfig.hasKitchen && ' Kitchen,'}
                    {towerConfig.bathroomCount > 0 && ` Bathroom 1-${towerConfig.bathroomCount},`}
                    {towerConfig.balconyCount > 0 && ` Balcony 1-${towerConfig.balconyCount}`}
                  </p>
                </div>
              </div>

              {/* Additional Room Types (Optional) */}
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

              {/* Preview */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">✨ Preview:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {towerConfig.hasPodium && <li>• 🏛️ Podiums: {towerConfig.podiumCount || 1} (P1, P2, P3...)</li>}
                  {towerConfig.hasCommonArea && <li>• 🏢 Common Areas: {towerConfig.commonAreaCount || 1} (CA1, CA2, CA3...)</li>}
                  {towerConfig.hasStaircase && <li>• 🪜 Staircases: {towerConfig.staircaseCount || 1} (Staircase 1, Staircase 2...)</li>}
                  <li>• {towerConfig.basementType !== 'none' ? `Basements: ${towerConfig.basementType === 'custom' ? (towerConfig.customBasements || 0) : towerConfig.basementType === 'b1_b2' ? '2 (B2, B1)' : '1 (B1)'}` : 'No basements'}</li>
                  <li>• Floors: Ground Floor + {towerConfig.totalFloors || 0} floors = {(parseInt(towerConfig.totalFloors) || 0) + 1} total</li>
                  <li>• Flats per floor: {towerConfig.defaultFlatsPerFloor}</li>
                  <li>• Total flats: {((parseInt(towerConfig.totalFloors) || 0) + 1 + (towerConfig.basementType === 'custom' ? (parseInt(towerConfig.customBasements) || 0) : towerConfig.basementType === 'b1_b2' ? 2 : towerConfig.basementType === 'b1' ? 1 : 0)) * towerConfig.defaultFlatsPerFloor}</li>
                  <li>• Rooms per flat: {towerConfig.bedroomCount || 0} Bedrooms, {towerConfig.bathroomCount || 0} Bathrooms, {towerConfig.balconyCount || 0} Balconies + {(towerConfig.hasLivingRoom ? 1 : 0) + (towerConfig.hasKitchen ? 1 : 0)} other rooms</li>
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

      {/* Wing Management Modal */}
      {showWingModal && selectedWingTower !== null && (
        <WingManagementModal
          tower={buildings[selectedWingTower]}
          towerIdx={selectedWingTower}
          onSave={saveWingChanges}
          onClose={() => setShowWingModal(false)}
        />
      )}

      {/* Floor Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Override Floor Configuration</h3>
                  <p className="text-white/90 text-sm mt-1">Customize this specific floor</p>
                </div>
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Flats Count Override */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Flats on This Floor
                </label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 6, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTowerConfig({ ...towerConfig, defaultFlatsPerFloor: num })}
                      className={`px-4 py-3 rounded-lg border-2 transition-all font-bold ${
                        towerConfig.defaultFlatsPerFloor === num
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  value={towerConfig.defaultFlatsPerFloor}
                  onChange={(e) => setTowerConfig({ ...towerConfig, defaultFlatsPerFloor: parseInt(e.target.value) || 1 })}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Flat Type Override */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Flat Type for This Floor
                </label>
                <select
                  value={towerConfig.defaultFlatType}
                  onChange={(e) => setTowerConfig({ ...towerConfig, defaultFlatType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-medium"
                >
                  {FLAT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Room Types Override */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Room Types for This Floor
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ROOM_TYPES.map(room => (
                    <label
                      key={room.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        towerConfig.defaultRooms.includes(room.value)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={towerConfig.defaultRooms.includes(room.value)}
                        onChange={() => toggleRoom(room.value)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-xl">{room.icon}</span>
                      <span className="font-medium text-gray-700 text-sm">{room.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3 sticky bottom-0">
              <button
                onClick={saveFloorOverride}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FaCheck /> Apply Override
              </button>
              <button
                onClick={() => setShowOverrideModal(false)}
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
