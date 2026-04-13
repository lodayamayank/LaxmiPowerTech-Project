import React, { useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';

const ProjectHierarchyManager = ({ buildings, onChange }) => {
  const [expandedBuildings, setExpandedBuildings] = useState({});
  const [expandedWings, setExpandedWings] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [expandedFlats, setExpandedFlats] = useState({});

  const toggleBuilding = (buildingId) => {
    setExpandedBuildings(prev => ({ ...prev, [buildingId]: !prev[buildingId] }));
  };

  const toggleWing = (key) => {
    setExpandedWings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFloor = (key) => {
    setExpandedFloors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFlat = (key) => {
    setExpandedFlats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addBuilding = () => {
    const newBuildings = [...buildings, { name: '', wings: [] }];
    onChange(newBuildings);
  };

  const updateBuilding = (index, name) => {
    const newBuildings = [...buildings];
    newBuildings[index].name = name;
    onChange(newBuildings);
  };

  const deleteBuilding = (index) => {
    const newBuildings = buildings.filter((_, i) => i !== index);
    onChange(newBuildings);
  };

  const addWing = (buildingIndex) => {
    const newBuildings = [...buildings];
    if (!newBuildings[buildingIndex].wings) {
      newBuildings[buildingIndex].wings = [];
    }
    newBuildings[buildingIndex].wings.push({ name: '', floors: [] });
    onChange(newBuildings);
  };

  const updateWing = (buildingIndex, wingIndex, name) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings[wingIndex].name = name;
    onChange(newBuildings);
  };

  const deleteWing = (buildingIndex, wingIndex) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings = newBuildings[buildingIndex].wings.filter((_, i) => i !== wingIndex);
    onChange(newBuildings);
  };

  const addFloor = (buildingIndex, wingIndex) => {
    const newBuildings = [...buildings];
    if (!newBuildings[buildingIndex].wings[wingIndex].floors) {
      newBuildings[buildingIndex].wings[wingIndex].floors = [];
    }
    newBuildings[buildingIndex].wings[wingIndex].floors.push({ name: '', flats: [] });
    onChange(newBuildings);
  };

  const updateFloor = (buildingIndex, wingIndex, floorIndex, name) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].name = name;
    onChange(newBuildings);
  };

  const deleteFloor = (buildingIndex, wingIndex, floorIndex) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings[wingIndex].floors = newBuildings[buildingIndex].wings[wingIndex].floors.filter((_, i) => i !== floorIndex);
    onChange(newBuildings);
  };

  const addFlat = (buildingIndex, wingIndex, floorIndex) => {
    const newBuildings = [...buildings];
    if (!newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats) {
      newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats = [];
    }
    newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats.push({ name: '', rooms: [] });
    onChange(newBuildings);
  };

  const updateFlat = (buildingIndex, wingIndex, floorIndex, flatIndex, name) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats[flatIndex].name = name;
    onChange(newBuildings);
  };

  const deleteFlat = (buildingIndex, wingIndex, floorIndex, flatIndex) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats = newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats.filter((_, i) => i !== flatIndex);
    onChange(newBuildings);
  };

  const addRoom = (buildingIndex, wingIndex, floorIndex, flatIndex) => {
    const newBuildings = [...buildings];
    if (!newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats[flatIndex].rooms) {
      newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats[flatIndex].rooms = [];
    }
    newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats[flatIndex].rooms.push({ name: '' });
    onChange(newBuildings);
  };

  const updateRoom = (buildingIndex, wingIndex, floorIndex, flatIndex, roomIndex, name) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats[flatIndex].rooms[roomIndex].name = name;
    onChange(newBuildings);
  };

  const deleteRoom = (buildingIndex, wingIndex, floorIndex, flatIndex, roomIndex) => {
    const newBuildings = [...buildings];
    newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats[flatIndex].rooms = newBuildings[buildingIndex].wings[wingIndex].floors[floorIndex].flats[flatIndex].rooms.filter((_, i) => i !== roomIndex);
    onChange(newBuildings);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Project Hierarchy (For Task Tracking)</h3>
        <button
          type="button"
          onClick={addBuilding}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <FaPlus /> Add Building
        </button>
      </div>

      {buildings.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">No buildings added yet. Click "Add Building" to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {buildings.map((building, bIdx) => (
            <div key={bIdx} className="border border-gray-200 rounded-lg bg-white">
              {/* Building Level */}
              <div className="p-3 bg-blue-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleBuilding(bIdx)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    {expandedBuildings[bIdx] ? <FaChevronDown /> : <FaChevronRight />}
                  </button>
                  <input
                    type="text"
                    value={building.name}
                    onChange={(e) => updateBuilding(bIdx, e.target.value)}
                    placeholder="Building Name (e.g., Main Building)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => addWing(bIdx)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <FaPlus /> Wing
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBuilding(bIdx)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Wings */}
              {expandedBuildings[bIdx] && building.wings && building.wings.length > 0 && (
                <div className="p-3 space-y-2">
                  {building.wings.map((wing, wIdx) => {
                    const wingKey = `${bIdx}-${wIdx}`;
                    return (
                      <div key={wIdx} className="border border-gray-200 rounded-lg bg-green-50">
                        <div className="p-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleWing(wingKey)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              {expandedWings[wingKey] ? <FaChevronDown /> : <FaChevronRight />}
                            </button>
                            <input
                              type="text"
                              value={wing.name}
                              onChange={(e) => updateWing(bIdx, wIdx, e.target.value)}
                              placeholder="Wing Name (e.g., Wing A)"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => addFloor(bIdx, wIdx)}
                              className="px-2 py-1.5 bg-purple-600 text-white rounded text-sm"
                            >
                              <FaPlus /> Floor
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteWing(bIdx, wIdx)}
                              className="px-2 py-1.5 bg-red-600 text-white rounded text-sm"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>

                        {/* Floors */}
                        {expandedWings[wingKey] && wing.floors && wing.floors.length > 0 && (
                          <div className="p-2 space-y-2">
                            {wing.floors.map((floor, fIdx) => {
                              const floorKey = `${bIdx}-${wIdx}-${fIdx}`;
                              return (
                                <div key={fIdx} className="border border-gray-200 rounded bg-purple-50">
                                  <div className="p-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleFloor(floorKey)}
                                        className="text-gray-600 hover:text-gray-800"
                                      >
                                        {expandedFloors[floorKey] ? <FaChevronDown /> : <FaChevronRight />}
                                      </button>
                                      <input
                                        type="text"
                                        value={floor.name}
                                        onChange={(e) => updateFloor(bIdx, wIdx, fIdx, e.target.value)}
                                        placeholder="Floor Name (e.g., 1st Floor)"
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => addFlat(bIdx, wIdx, fIdx)}
                                        className="px-2 py-1 bg-orange-600 text-white rounded text-sm"
                                      >
                                        <FaPlus /> Flat
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteFloor(bIdx, wIdx, fIdx)}
                                        className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                                      >
                                        <FaTrash />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Flats */}
                                  {expandedFloors[floorKey] && floor.flats && floor.flats.length > 0 && (
                                    <div className="p-2 space-y-2">
                                      {floor.flats.map((flat, flatIdx) => {
                                        const flatKey = `${bIdx}-${wIdx}-${fIdx}-${flatIdx}`;
                                        return (
                                          <div key={flatIdx} className="border border-gray-200 rounded bg-orange-50">
                                            <div className="p-2">
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleFlat(flatKey)}
                                                  className="text-gray-600 hover:text-gray-800"
                                                >
                                                  {expandedFlats[flatKey] ? <FaChevronDown /> : <FaChevronRight />}
                                                </button>
                                                <input
                                                  type="text"
                                                  value={flat.name}
                                                  onChange={(e) => updateFlat(bIdx, wIdx, fIdx, flatIdx, e.target.value)}
                                                  placeholder="Flat Name (e.g., 101)"
                                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => addRoom(bIdx, wIdx, fIdx, flatIdx)}
                                                  className="px-2 py-1 bg-teal-600 text-white rounded text-sm"
                                                >
                                                  <FaPlus /> Room
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => deleteFlat(bIdx, wIdx, fIdx, flatIdx)}
                                                  className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                                                >
                                                  <FaTrash />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Rooms */}
                                            {expandedFlats[flatKey] && flat.rooms && flat.rooms.length > 0 && (
                                              <div className="p-2 space-y-1">
                                                {flat.rooms.map((room, rIdx) => (
                                                  <div key={rIdx} className="flex items-center gap-2 bg-teal-50 p-2 rounded">
                                                    <input
                                                      type="text"
                                                      value={room.name}
                                                      onChange={(e) => updateRoom(bIdx, wIdx, fIdx, flatIdx, rIdx, e.target.value)}
                                                      placeholder="Room Name (e.g., Living Room)"
                                                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => deleteRoom(bIdx, wIdx, fIdx, flatIdx, rIdx)}
                                                      className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                                                    >
                                                      <FaTrash />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
      )}
    </div>
  );
};

export default ProjectHierarchyManager;
