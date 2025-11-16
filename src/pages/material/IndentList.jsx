import React, { useState } from "react";

export default function IndentList({ setScreen }) {
  const [materials, setMaterials] = useState([]);
  const [input, setInput] = useState("");

  const addMaterial = () => {
    if (input.trim()) {
      setMaterials([...materials, input]);
      setInput("");
    }
  };

  return (
    <div className="p-6 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Step 1/3 Select Material</h2>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter Material Name"
          className="w-full border rounded-lg p-2 mb-3 focus:ring-2 focus:ring-orange-400 outline-none"
        />
        <button
          onClick={addMaterial}
          className="bg-orange-500 text-white w-full py-2 rounded-lg mb-4 hover:bg-orange-600 transition"
        >
          Add Quantity
        </button>

        <h3 className="text-orange-500 text-sm font-semibold mb-2">Project Inventory</h3>

        <ul className="space-y-2">
          {materials.map((mat, i) => (
            <li
              key={i}
              className="flex justify-between items-center bg-gray-100 p-3 rounded-xl shadow-sm"
            >
              <span className="text-gray-700">{mat}</span>
              <span className="bg-orange-100 text-orange-600 px-3 py-1 text-xs rounded-lg">Qty</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => setScreen("material")}
        className="mt-6 w-full py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        ← Back
      </button> 
    </div>
  );
}
