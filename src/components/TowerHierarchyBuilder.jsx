import React, { useState } from 'react';
import { 
  FaPlus, 
  FaTrash, 
  FaChevronDown, 
  FaChevronRight, 
  FaCopy,
  FaBuilding,
  FaLayerGroup,
  FaDoorOpen,
  FaBed
} from 'react-icons/fa';

const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room / Hall', icon: '🛋️' },
  { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'bathroom', label: 'Bathroom', icon: '🚿' },
  { value: 'balcony', label: 'Balcony', icon: '🌿' },
  { value: 'utility', label: 'Utility / Store', icon: '🔧' },
  { value: 'dining', label: 'Dining Room', icon: '🍽️' },
  { value: 'study', label: 'Study Room', icon: '📚' },
  { value: 'pooja', label: 'Pooja Room', icon: '🙏' },
  { value: 'terrace', label: 'Terrace', icon: '🏠' },
];

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Duplex', 'Custom'];

const LEVEL_3_ACTIVITIES = [
  'Slab Conduiting',
  'Box Fixing',
  'Wiring',
  'Switch Plate',
  'Testing And Commissioning'
];

const TowerHierarchyBuilder = ({ buildings, onChange }) => {
  const [expandedTowers, setExpandedTowers] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [expandedFlats, setExpandedFlats] = useState({});

  const toggleTower = (towerIdx) => {
    setExpandedTowers(prev => ({ ...prev, [towerIdx]: !prev[towerIdx] }));
  };

  const toggleFloor = (key) => {
    setExpandedFloors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFlat = (key) => {
    setExpandedFlats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Tower Management
  const addTower = () => {
    const newBuildings = [...buildings, { 
      name: `Tower ${String.fromCharCode(65 + buildings.length)}`,
      staircases: [],
      podiums: [],
      commonAreas: [],
      wings: [{
        name: 'Default',
        floors: []
      }]
    }];
    onChange(newBuildings);
    setExpandedTowers(prev => ({ ...prev, [buildings.length]: true }));
  };

  const updateTowerName = (towerIdx, name) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].name = name;
    onChange(newBuildings);
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

  // Floor Management
  const addFloor = (towerIdx, wingIdx) => {
    const newBuildings = [...buildings];
    const wing = newBuildings[towerIdx].wings[wingIdx];
    const floorCount = wing.floors.length;
    const lastFloorNum = floorCount > 0 ? wing.floors[floorCount - 1].floorNumber || 0 : 0;
    
    wing.floors.push({
      name: `Floor ${lastFloorNum + 1}`,
      floorNumber: lastFloorNum + 1,
      isBasement: false,
      flats: []
    });
    onChange(newBuildings);
  };

  const addBasement = (towerIdx, wingIdx) => {
    const newBuildings = [...buildings];
    const wing = newBuildings[towerIdx].wings[wingIdx];
    const basementCount = wing.floors.filter(f => f.isBasement).length;
    
    wing.floors.unshift({
      name: `B${basementCount + 1}`,
      floorNumber: -(basementCount + 1),
      isBasement: true,
      flats: []
    });
    onChange(newBuildings);
  };

  const updateFloor = (towerIdx, wingIdx, floorIdx, field, value) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].wings[wingIdx].floors[floorIdx][field] = value;
    onChange(newBuildings);
  };

  const deleteFloor = (towerIdx, wingIdx, floorIdx) => {
    if (window.confirm('Delete this floor and all its flats?')) {
      const newBuildings = [...buildings];
      newBuildings[towerIdx].wings[wingIdx].floors = 
        newBuildings[towerIdx].wings[wingIdx].floors.filter((_, i) => i !== floorIdx);
      onChange(newBuildings);
    }
  };

  // Flat Management
  const addFlat = (towerIdx, wingIdx, floorIdx) => {
    const newBuildings = [...buildings];
    const floor = newBuildings[towerIdx].wings[wingIdx].floors[floorIdx];
    const flatCount = floor.flats.length;
    
    floor.flats.push({
      name: `Flat ${flatCount + 1}`,
      flatNumber: `${floor.floorNumber}0${flatCount + 1}`,
      flatType: '2BHK',
      bedroomCount: 2,
      bathroomCount: 2,
      hasBalcony: true,
      hasKitchen: true,
      hasLivingRoom: true,
      rooms: [],
      variation: 'Standard'
    });
    onChange(newBuildings);
  };

  const updateFlat = (towerIdx, wingIdx, floorIdx, flatIdx, field, value) => {
    const newBuildings = [...buildings];
    newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx][field] = value;
    onChange(newBuildings);
  };

  const deleteFlat = (towerIdx, wingIdx, floorIdx, flatIdx) => {
    if (window.confirm('Delete this flat?')) {
      const newBuildings = [...buildings];
      newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats = 
        newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats.filter((_, i) => i !== flatIdx);
      onChange(newBuildings);
    }
  };

  // Room Management
  const toggleRoom = (towerIdx, wingIdx, floorIdx, flatIdx, roomType) => {
    const newBuildings = [...buildings];
    const flat = newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx];
    const roomIndex = flat.rooms.findIndex(r => r.type === roomType.value);
    
    if (roomIndex > -1) {
      flat.rooms.splice(roomIndex, 1);
    } else {
      flat.rooms.push({ name: roomType.label, type: roomType.value });
    }
    onChange(newBuildings);
  };

  const isRoomSelected = (flat, roomType) => {
    return flat.rooms?.some(r => r.type === roomType.value);
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
      type: 'Main Staircase'
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
      description: ''
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
      description: ''
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
    const flat = newBuildings[towerIdx].wings[wingIdx].floors[floorIdx].flats[flatIdx];
    const rooms = [];

    // Add living room
    if (flat.hasLivingRoom) {
      rooms.push({ name: 'Living Room / Hall', type: 'living_room' });
    }

    // Add bedrooms
    for (let i = 1; i <= (flat.bedroomCount || 0); i++) {
      rooms.push({ name: `Bedroom ${i}`, type: 'bedroom' });
    }

    // Add kitchen
    if (flat.hasKitchen) {
      rooms.push({ name: 'Kitchen', type: 'kitchen' });
    }

    // Add bathrooms
    for (let i = 1; i <= (flat.bathroomCount || 0); i++) {
      rooms.push({ name: `Bathroom ${i}`, type: 'bathroom' });
    }

    // Add balcony
    if (flat.hasBalcony) {
      rooms.push({ name: 'Balcony', type: 'balcony' });
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
          <p className="text-xs text-gray-500 mt-1">Build your project hierarchy: Tower → Floor → Flat → Rooms</p>
        </div>
        <button
          type="button"
          onClick={addTower}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-md text-sm font-medium"
        >
          <FaPlus /> Add Tower
        </button>
      </div>

      {buildings.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <FaBuilding className="text-gray-400 text-5xl mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No towers added yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Tower" to start building your project structure</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buildings.map((tower, tIdx) => (
            <div key={tIdx} className="border-2 border-orange-200 rounded-xl bg-white shadow-sm overflow-hidden">
              {/* Tower Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTower(tIdx)}
                    className="text-white hover:bg-white/20 p-1 rounded transition-colors"
                  >
                    {expandedTowers[tIdx] ? <FaChevronDown /> : <FaChevronRight />}
                  </button>
                  <FaBuilding className="text-white text-xl" />
                  <input
                    type="text"
                    value={tower.name}
                    onChange={(e) => updateTowerName(tIdx, e.target.value)}
                    placeholder="Tower Name"
                    className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 font-semibold focus:bg-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyTower(tIdx)}
                    className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                    title="Copy Tower"
                  >
                    <FaCopy /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTower(tIdx)}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    title="Delete Tower"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Tower Content */}
              {expandedTowers[tIdx] && (
                <div className="p-4 space-y-4">
                  {/* Staircases Section */}
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                        🪜 Staircases
                      </h4>
                      <button
                        type="button"
                        onClick={() => addStaircase(tIdx)}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-1"
                      >
                        <FaPlus /> Add Staircase
                      </button>
                    </div>
                    {tower.staircases?.length === 0 || !tower.staircases ? (
                      <p className="text-sm text-purple-600">No staircases added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {tower.staircases.map((staircase, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2 bg-white p-2 rounded border border-purple-300">
                            <input
                              type="text"
                              value={staircase.name}
                              onChange={(e) => updateStaircase(tIdx, sIdx, 'name', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Staircase name"
                            />
                            <input
                              type="text"
                              value={staircase.type || ''}
                              onChange={(e) => updateStaircase(tIdx, sIdx, 'type', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Type (e.g., Main, Service)"
                            />
                            <button
                              type="button"
                              onClick={() => deleteStaircase(tIdx, sIdx)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Podiums Section */}
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                        🏛️ Podiums
                      </h4>
                      <button
                        type="button"
                        onClick={() => addPodium(tIdx)}
                        className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center gap-1"
                      >
                        <FaPlus /> Add Podium
                      </button>
                    </div>
                    {tower.podiums?.length === 0 || !tower.podiums ? (
                      <p className="text-sm text-yellow-600">No podiums added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {tower.podiums.map((podium, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-2 bg-white p-2 rounded border border-yellow-300">
                            <input
                              type="text"
                              value={podium.name}
                              onChange={(e) => updatePodium(tIdx, pIdx, 'name', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm font-medium"
                              placeholder="P1, P2..."
                            />
                            <input
                              type="text"
                              value={podium.description || ''}
                              onChange={(e) => updatePodium(tIdx, pIdx, 'description', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Description (optional)"
                            />
                            <button
                              type="button"
                              onClick={() => deletePodium(tIdx, pIdx)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Common Areas Section */}
                  <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-cyan-800 flex items-center gap-2">
                        🏢 Common Areas
                      </h4>
                      <button
                        type="button"
                        onClick={() => addCommonArea(tIdx)}
                        className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm flex items-center gap-1"
                      >
                        <FaPlus /> Add Common Area
                      </button>
                    </div>
                    {tower.commonAreas?.length === 0 || !tower.commonAreas ? (
                      <p className="text-sm text-cyan-600">No common areas added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {tower.commonAreas.map((area, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2 bg-white p-2 rounded border border-cyan-300">
                            <input
                              type="text"
                              value={area.name}
                              onChange={(e) => updateCommonArea(tIdx, aIdx, 'name', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm font-medium"
                              placeholder="CA1, CA2..."
                            />
                            <input
                              type="text"
                              value={area.description || ''}
                              onChange={(e) => updateCommonArea(tIdx, aIdx, 'description', e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Description (e.g., Gym, Pool)"
                            />
                            <button
                              type="button"
                              onClick={() => deleteCommonArea(tIdx, aIdx)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wings and Floors */}
              {expandedTowers[tIdx] && tower.wings?.map((wing, wIdx) => (
                <div key={wIdx} className="p-4 pt-0">
                  {/* Floor Management Buttons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => addFloor(tIdx, wIdx)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <FaPlus /> Add Floor
                    </button>
                    <button
                      type="button"
                      onClick={() => addBasement(tIdx, wIdx)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      <FaPlus /> Add Basement
                    </button>
                  </div>

                  {/* Floors List */}
                  {wing.floors?.length === 0 ? (
                    <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200">
                      <FaLayerGroup className="text-blue-400 text-3xl mx-auto mb-2" />
                      <p className="text-blue-600 text-sm">No floors added yet. Add a floor or basement to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {wing.floors.map((floor, fIdx) => {
                        const floorKey = `${tIdx}-${wIdx}-${fIdx}`;
                        return (
                          <div key={fIdx} className={`border-2 rounded-lg ${floor.isBasement ? 'border-gray-300 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}>
                            {/* Floor Header */}
                            <div className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleFloor(floorKey)}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  {expandedFloors[floorKey] ? <FaChevronDown /> : <FaChevronRight />}
                                </button>
                                <FaLayerGroup className={floor.isBasement ? 'text-gray-600' : 'text-blue-600'} />
                                <input
                                  type="text"
                                  value={floor.name}
                                  onChange={(e) => updateFloor(tIdx, wIdx, fIdx, 'name', e.target.value)}
                                  placeholder="Floor Name"
                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => addFlat(tIdx, wIdx, fIdx)}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                                >
                                  <FaPlus /> Flat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteFloor(tIdx, wIdx, fIdx)}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>

                            {/* Flats */}
                            {expandedFloors[floorKey] && (
                              <div className="p-3 pt-0">
                                {floor.flats?.length === 0 ? (
                                  <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                                    <FaDoorOpen className="text-gray-400 text-2xl mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No flats added. Click "Add Flat" to add flats to this floor.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {floor.flats.map((flat, flatIdx) => {
                                      const flatKey = `${tIdx}-${wIdx}-${fIdx}-${flatIdx}`;
                                      return (
                                        <div key={flatIdx} className="border-2 border-green-200 bg-green-50 rounded-lg">
                                          {/* Flat Header */}
                                          <div className="p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <button
                                                type="button"
                                                onClick={() => toggleFlat(flatKey)}
                                                className="text-gray-600 hover:text-gray-800"
                                              >
                                                {expandedFlats[flatKey] ? <FaChevronDown /> : <FaChevronRight />}
                                              </button>
                                              <FaDoorOpen className="text-green-600" />
                                              <input
                                                type="text"
                                                value={flat.name}
                                                onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'name', e.target.value)}
                                                placeholder="Flat Name"
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:ring-2 focus:ring-green-500"
                                              />
                                              <input
                                                type="text"
                                                value={flat.flatNumber || ''}
                                                onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'flatNumber', e.target.value)}
                                                placeholder="Flat No."
                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                                              />
                                              <select
                                                value={flat.flatType || '2BHK'}
                                                onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'flatType', e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                                              >
                                                {FLAT_TYPES.map(type => (
                                                  <option key={type} value={type}>{type}</option>
                                                ))}
                                              </select>
                                              <button
                                                type="button"
                                                onClick={() => deleteFlat(tIdx, wIdx, fIdx, flatIdx)}
                                                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                              >
                                                <FaTrash />
                                              </button>
                                            </div>

                                            {/* Flat Configuration & Rooms */}
                                            {expandedFlats[flatKey] && (
                                              <div className="mt-3 space-y-3">
                                                {/* Flat Configuration */}
                                                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                                  <p className="text-sm font-semibold text-indigo-800 mb-2">🏗️ Flat Configuration</p>
                                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    <div>
                                                      <label className="text-xs text-gray-600 mb-1 block">Variation</label>
                                                      <input
                                                        type="text"
                                                        value={flat.variation || 'Standard'}
                                                        onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'variation', e.target.value)}
                                                        placeholder="e.g., Premium, Standard"
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="text-xs text-gray-600 mb-1 block">Bedrooms</label>
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        max="10"
                                                        value={flat.bedroomCount || 2}
                                                        onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'bedroomCount', parseInt(e.target.value))}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                      />
                                                    </div>
                                                    <div>
                                                      <label className="text-xs text-gray-600 mb-1 block">Bathrooms</label>
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        max="10"
                                                        value={flat.bathroomCount || 2}
                                                        onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'bathroomCount', parseInt(e.target.value))}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                      />
                                                    </div>
                                                    <label className="flex items-center gap-2 col-span-1">
                                                      <input
                                                        type="checkbox"
                                                        checked={flat.hasLivingRoom !== false}
                                                        onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'hasLivingRoom', e.target.checked)}
                                                        className="w-4 h-4 text-green-600 rounded"
                                                      />
                                                      <span className="text-xs text-gray-700">Living Room</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 col-span-1">
                                                      <input
                                                        type="checkbox"
                                                        checked={flat.hasKitchen !== false}
                                                        onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'hasKitchen', e.target.checked)}
                                                        className="w-4 h-4 text-green-600 rounded"
                                                      />
                                                      <span className="text-xs text-gray-700">Kitchen</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 col-span-1">
                                                      <input
                                                        type="checkbox"
                                                        checked={flat.hasBalcony !== false}
                                                        onChange={(e) => updateFlat(tIdx, wIdx, fIdx, flatIdx, 'hasBalcony', e.target.checked)}
                                                        className="w-4 h-4 text-green-600 rounded"
                                                      />
                                                      <span className="text-xs text-gray-700">Balcony</span>
                                                    </label>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => autoGenerateRooms(tIdx, wIdx, fIdx, flatIdx)}
                                                    className="mt-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                                                  >
                                                    ⚡ Auto-Generate Rooms
                                                  </button>
                                                </div>

                                                {/* Room Selection */}
                                                <div className="p-3 bg-white rounded-lg border border-green-200">
                                                  <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                      <FaBed className="text-green-600" />
                                                      <p className="text-sm font-semibold text-gray-700">Room Types (Manual Selection):</p>
                                                    </div>
                                                  </div>
                                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {ROOM_TYPES.map(roomType => (
                                                      <label
                                                        key={roomType.value}
                                                        className="flex items-center gap-2 p-2 rounded-lg border-2 border-gray-200 hover:border-green-400 cursor-pointer transition-colors bg-white"
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={isRoomSelected(flat, roomType)}
                                                          onChange={() => toggleRoom(tIdx, wIdx, fIdx, flatIdx, roomType)}
                                                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                                        />
                                                        <span className="text-sm flex items-center gap-1">
                                                          <span>{roomType.icon}</span>
                                                          <span>{roomType.label}</span>
                                                        </span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                  {flat.rooms?.length > 0 && (
                                                    <div className="mt-2 p-2 bg-green-50 rounded text-xs text-gray-600">
                                                      <strong>Rooms ({flat.rooms.length}):</strong> {flat.rooms.map(r => r.name).join(', ')}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Structure Summary */}
      {buildings.length > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">📊 Project Summary:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div className="bg-white p-2 rounded">
              <p className="text-gray-500">Towers</p>
              <p className="text-xl font-bold text-orange-600">{buildings.length}</p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-gray-500">Staircases</p>
              <p className="text-xl font-bold text-purple-600">
                {buildings.reduce((sum, t) => sum + (t.staircases?.length || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-gray-500">Podiums</p>
              <p className="text-xl font-bold text-yellow-600">
                {buildings.reduce((sum, t) => sum + (t.podiums?.length || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-gray-500">Common Areas</p>
              <p className="text-xl font-bold text-cyan-600">
                {buildings.reduce((sum, t) => sum + (t.commonAreas?.length || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-gray-500">Total Floors</p>
              <p className="text-xl font-bold text-blue-600">
                {buildings.reduce((sum, t) => sum + (t.wings?.[0]?.floors?.length || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-gray-500">Total Flats</p>
              <p className="text-xl font-bold text-green-600">
                {buildings.reduce((sum, t) => 
                  sum + (t.wings?.[0]?.floors?.reduce((fSum, f) => fSum + (f.flats?.length || 0), 0) || 0), 0
                )}
              </p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="text-gray-500">Basements</p>
              <p className="text-xl font-bold text-gray-600">
                {buildings.reduce((sum, t) => 
                  sum + (t.wings?.[0]?.floors?.filter(f => f.isBasement)?.length || 0), 0
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TowerHierarchyBuilder;
