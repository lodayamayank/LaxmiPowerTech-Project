import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ProjectHierarchyManager = ({ buildings, onChange }) => {
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
        <Accordion type="multiple" className="space-y-3">
          {buildings.map((building, bIdx) => (
            <AccordionItem key={bIdx} value={`building-${bIdx}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {/* Building Level */}
              <div className="p-3 bg-blue-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <AccordionTrigger
                    aria-label={`Toggle building ${building.name || bIdx + 1}`}
                    className="h-8 w-8 flex-none justify-center rounded p-1 text-gray-600 hover:text-gray-800 hover:no-underline"
                  />
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
              <AccordionContent className="p-3">
                {building.wings?.length > 0 && (
                  <Accordion type="multiple" className="space-y-2">
                  {building.wings.map((wing, wIdx) => {
                    const wingKey = `${bIdx}-${wIdx}`;
                    return (
                      <AccordionItem key={wIdx} value={`wing-${wingKey}`} className="rounded-lg border border-gray-200 bg-green-50">
                        <div className="p-2">
                          <div className="flex items-center gap-2">
                            <AccordionTrigger
                              aria-label={`Toggle wing ${wing.name || wIdx + 1}`}
                              className="h-8 w-8 flex-none justify-center rounded p-1 text-gray-600 hover:text-gray-800 hover:no-underline"
                            />
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
                        {wing.floors?.length > 0 && (
                          <AccordionContent className="p-2">
                            <Accordion type="multiple" className="space-y-2">
                            {wing.floors.map((floor, fIdx) => {
                              const floorKey = `${bIdx}-${wIdx}-${fIdx}`;
                              return (
                                <AccordionItem key={fIdx} value={`floor-${floorKey}`} className="rounded border border-gray-200 bg-purple-50">
                                  <div className="p-2">
                                    <div className="flex items-center gap-2">
                                      <AccordionTrigger
                                        aria-label={`Toggle floor ${floor.name || fIdx + 1}`}
                                        className="h-8 w-8 flex-none justify-center rounded p-1 text-gray-600 hover:text-gray-800 hover:no-underline"
                                      />
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
                                  {floor.flats?.length > 0 && (
                                    <AccordionContent className="p-2">
                                      <Accordion type="multiple" className="space-y-2">
                                      {floor.flats.map((flat, flatIdx) => {
                                        const flatKey = `${bIdx}-${wIdx}-${fIdx}-${flatIdx}`;
                                        return (
                                          <AccordionItem key={flatIdx} value={`flat-${flatKey}`} className="rounded border border-gray-200 bg-orange-50">
                                            <div className="p-2">
                                              <div className="flex items-center gap-2">
                                                <AccordionTrigger
                                                  aria-label={`Toggle flat ${flat.name || flatIdx + 1}`}
                                                  className="h-8 w-8 flex-none justify-center rounded p-1 text-gray-600 hover:text-gray-800 hover:no-underline"
                                                />
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
                                            {flat.rooms?.length > 0 && (
                                              <AccordionContent className="p-2">
                                                <div className="space-y-1">
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
                                              </AccordionContent>
                                            )}
                                          </AccordionItem>
                                        );
                                      })}
                                      </Accordion>
                                    </AccordionContent>
                                  )}
                                </AccordionItem>
                              );
                            })}
                            </Accordion>
                          </AccordionContent>
                        )}
                      </AccordionItem>
                    );
                  })}
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default ProjectHierarchyManager;
