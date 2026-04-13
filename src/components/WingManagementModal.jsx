import React, { useState } from 'react';
import { FaPlus, FaTrash, FaEdit, FaCheck, FaTimes, FaCopy } from 'react-icons/fa';

const WingManagementModal = ({ tower, towerIdx, onSave, onClose }) => {
  const [localTower, setLocalTower] = useState(JSON.parse(JSON.stringify(tower)));
  const [editingWingIdx, setEditingWingIdx] = useState(null);
  const [editWingName, setEditWingName] = useState('');

  const addWing = () => {
    const newWing = {
      name: `Wing ${String.fromCharCode(65 + localTower.wings.length)}`,
      floors: []
    };
    setLocalTower({
      ...localTower,
      wings: [...localTower.wings, newWing]
    });
  };

  const deleteWing = (wingIdx) => {
    if (localTower.wings.length <= 1) {
      alert('Cannot delete the last wing. Tower must have at least one wing.');
      return;
    }
    if (window.confirm('Delete this wing and all its floors?')) {
      const newWings = localTower.wings.filter((_, idx) => idx !== wingIdx);
      setLocalTower({
        ...localTower,
        wings: newWings
      });
    }
  };

  const copyWing = (wingIdx) => {
    const copiedWing = JSON.parse(JSON.stringify(localTower.wings[wingIdx]));
    copiedWing.name = `${copiedWing.name} (Copy)`;
    setLocalTower({
      ...localTower,
      wings: [...localTower.wings, copiedWing]
    });
  };

  const startEditWing = (wingIdx) => {
    setEditingWingIdx(wingIdx);
    setEditWingName(localTower.wings[wingIdx].name);
  };

  const saveWingName = () => {
    const newWings = [...localTower.wings];
    newWings[editingWingIdx].name = editWingName;
    setLocalTower({
      ...localTower,
      wings: newWings
    });
    setEditingWingIdx(null);
  };

  const cancelEditWing = () => {
    setEditingWingIdx(null);
    setEditWingName('');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Wing Management</h3>
              <p className="text-white/90 text-sm mt-1">{tower.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Manage wings for this tower. Each wing can have its own floors and configuration.
            </p>
            <button
              onClick={addWing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <FaPlus /> Add Wing
            </button>
          </div>

          <div className="space-y-3">
            {localTower.wings.map((wing, wingIdx) => (
              <div
                key={wingIdx}
                className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50"
              >
                <div className="flex items-center justify-between">
                  {editingWingIdx === wingIdx ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editWingName}
                        onChange={(e) => setEditWingName(e.target.value)}
                        className="flex-1 px-3 py-2 border-2 border-indigo-500 rounded-lg focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={saveWingName}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={cancelEditWing}
                        className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🏢</span>
                        <div>
                          <p className="font-bold text-gray-800">{wing.name}</p>
                          <p className="text-xs text-gray-500">
                            {wing.floors?.length || 0} floors
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditWing(wingIdx)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm"
                        >
                          <FaEdit size={12} /> Edit
                        </button>
                        <button
                          onClick={() => copyWing(wingIdx)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 text-sm"
                        >
                          <FaCopy size={12} /> Copy
                        </button>
                        <button
                          onClick={() => deleteWing(wingIdx)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          disabled={localTower.wings.length <= 1}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {localTower.wings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No wings added yet. Click "Add Wing" to create one.
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex gap-3 sticky bottom-0">
          <button
            onClick={() => onSave(localTower)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold flex items-center justify-center gap-2"
          >
            <FaCheck /> Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WingManagementModal;
