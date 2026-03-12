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
  FaTimes
} from 'react-icons/fa';

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

const FLAT_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'Studio', 'Penthouse', 'Duplex', 'Custom'];

const SmartTowerBuilder = ({ buildings, onChange }) => {
  const [expandedTowers, setExpandedTowers] = useState({});
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentTowerIdx, setCurrentTowerIdx] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideFloorIdx, setOverrideFloorIdx] = useState(null);

  // Configuration state for smart generation
  const [towerConfig, setTowerConfig] = useState({
    towerName: '',
    basementType: 'none',
    customBasements: '',
    totalFloors: '',
    defaultFlatsPerFloor: 4,
    defaultFlatType: '2BHK',
    defaultRooms: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'balcony']
  });

  const toggleTower = (towerIdx) => {
    setExpandedTowers(prev => ({ ...prev, [towerIdx]: !prev[towerIdx] }));
  };

  // Smart generation function
  const generateTowerStructure = () => {
    const { basementType, customBasements, totalFloors, defaultFlatsPerFloor, defaultFlatType, defaultRooms, towerName } = towerConfig;
    
    const floors = [];
    const numBasements = parseInt(customBasements) || 0;
    const numFloors = parseInt(totalFloors) || 0;
    
    // Generate basements
    if (basementType === 'b1') {
      floors.push(createFloor('B1', -1, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms));
    } else if (basementType === 'b1_b2') {
      floors.push(createFloor('B2', -2, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms));
      floors.push(createFloor('B1', -1, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms));
    } else if (basementType === 'custom' && numBasements > 0) {
      for (let b = numBasements; b >= 1; b--) {
        floors.push(createFloor(`B${b}`, -b, true, defaultFlatsPerFloor, defaultFlatType, defaultRooms));
      }
    }
    
    // Generate Ground Floor
    floors.push(createFloor('Ground Floor', 0, false, defaultFlatsPerFloor, defaultFlatType, defaultRooms));
    
    // Generate regular floors
    for (let f = 1; f <= numFloors; f++) {
      const suffix = f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th';
      floors.push(createFloor(`${f}${suffix} Floor`, f, false, defaultFlatsPerFloor, defaultFlatType, defaultRooms));
    }
    
    return {
      name: towerName || `Tower ${String.fromCharCode(65 + buildings.length)}`,
      wings: [{
        name: 'Default',
        floors: floors
      }]
    };
  };

  const createFloor = (name, floorNumber, isBasement, flatsCount, flatType, roomTypes) => {
    const flats = [];
    for (let i = 1; i <= flatsCount; i++) {
      const flatNumber = floorNumber >= 0 ? `${floorNumber}0${i}` : `B${Math.abs(floorNumber)}0${i}`;
      flats.push({
        name: `Flat ${i}`,
        flatNumber: flatNumber,
        flatType: flatType,
        rooms: roomTypes.map(type => {
          const roomDef = ROOM_TYPES.find(r => r.value === type);
          return { name: roomDef.label, type: type };
        })
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
      basementType: 'none',
      customBasements: '',
      totalFloors: '',
      defaultFlatsPerFloor: 4,
      defaultFlatType: '2BHK',
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

      {/* Tower List */}
      {buildings.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-dashed border-orange-300">
          <FaMagic className="text-orange-400 text-6xl mx-auto mb-4 animate-pulse" />
          <p className="text-gray-700 font-semibold text-lg">No towers created yet</p>
          <p className="text-gray-500 text-sm mt-2">Click "Smart Generate Tower" to auto-create a complete building structure</p>
          <p className="text-gray-400 text-xs mt-1">Configure once, generate floors, flats & rooms automatically!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buildings.map((tower, tIdx) => (
            <div key={tIdx} className="border-2 border-orange-200 rounded-xl bg-white shadow-lg overflow-hidden">
              {/* Tower Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTower(tIdx)}
                    className="text-white hover:bg-white/20 p-2 rounded transition-colors"
                  >
                    {expandedTowers[tIdx] ? <FaChevronDown size={18} /> : <FaChevronRight size={18} />}
                  </button>
                  <FaBuilding className="text-white text-2xl" />
                  <input
                    type="text"
                    value={tower.name}
                    onChange={(e) => updateTowerName(tIdx, e.target.value)}
                    placeholder="Tower Name"
                    className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 font-bold text-lg focus:bg-white/30 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full">
                      {tower.wings?.[0]?.floors?.length || 0} Floors
                    </span>
                    <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full">
                      {tower.wings?.[0]?.floors?.reduce((sum, f) => sum + (f.flats?.length || 0), 0) || 0} Flats
                    </span>
                  </div>
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
                <div className="p-6">
                  {tower.wings?.[0]?.floors?.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No floors in this tower</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Floors Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Floor</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Flats</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Type</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Rooms</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tower.wings[0].floors.map((floor, fIdx) => (
                              <tr key={fIdx} className={`border-t hover:bg-blue-50 transition-colors ${floor.isBasement ? 'bg-gray-50' : ''}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {floor.isBasement && <span className="text-gray-500 text-xs">🅱️</span>}
                                    <span className="font-medium text-gray-800">{floor.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                    {floor.flats?.length || 0}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm text-gray-600">
                                    {floor.flats?.[0]?.flatType || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-xs text-gray-500">
                                    {floor.flats?.[0]?.rooms?.length || 0} room types
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openFloorOverride(tIdx, 0, fIdx)}
                                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                                    >
                                      <FaEdit size={12} /> Override
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteFloor(tIdx, 0, fIdx)}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
                                      title="Delete Floor"
                                    >
                                      <FaTrash size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
                  value={towerConfig.defaultFlatsPerFloor}
                  onChange={(e) => setTowerConfig({ ...towerConfig, defaultFlatsPerFloor: parseInt(e.target.value) || 4 })}
                  placeholder="Custom number"
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
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

              {/* Default Room Configuration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🛏️ Default Room Types (select all that apply)
                </label>
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
                  <li>• {towerConfig.basementType !== 'none' ? `Basements: ${towerConfig.basementType === 'custom' ? (towerConfig.customBasements || 0) : towerConfig.basementType === 'b1_b2' ? '2 (B2, B1)' : '1 (B1)'}` : 'No basements'}</li>
                  <li>• Floors: Ground Floor + {towerConfig.totalFloors || 0} floors = {(parseInt(towerConfig.totalFloors) || 0) + 1} total</li>
                  <li>• Flats per floor: {towerConfig.defaultFlatsPerFloor}</li>
                  <li>• Total flats: {((parseInt(towerConfig.totalFloors) || 0) + 1 + (towerConfig.basementType === 'custom' ? (parseInt(towerConfig.customBasements) || 0) : towerConfig.basementType === 'b1_b2' ? 2 : towerConfig.basementType === 'b1' ? 1 : 0)) * towerConfig.defaultFlatsPerFloor}</li>
                  <li>• Room types: {towerConfig.defaultRooms.length} types per flat</li>
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
