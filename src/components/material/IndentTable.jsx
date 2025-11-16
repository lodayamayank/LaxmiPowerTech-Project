import { useState } from "react";

export default function IndentTable({ data }) {
  const [search, setSearch] = useState("");

  // Filter and sort data based on search
  const filteredData = data
    .filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      // Sort alphabetically by first column
      const firstKey = Object.keys(data[0])[0];
      const aValue = String(a[firstKey] || '').toLowerCase();
      const bValue = String(b[firstKey] || '').toLowerCase();
      return aValue.localeCompare(bValue);
    });

  if (!data || data.length === 0)
    return <p className="text-gray-500 text-center mt-10">No data found.</p>;

  return (
    <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Indent Table</h2>
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 rounded p-2 w-64 focus:ring-2 focus:ring-orange-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className="min-w-full border text-sm">
        <thead className="bg-orange-100">
          <tr>
            {Object.keys(data[0]).map((col) => (
              <th key={col} className="border px-4 py-2 text-left font-medium text-gray-700">
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredData.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {Object.keys(row).map((col) => {
                const value = row[col];

               

                // Normal text cell
                return (
                  <td key={col} className="border px-4 py-2">
                    {String(value || "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
