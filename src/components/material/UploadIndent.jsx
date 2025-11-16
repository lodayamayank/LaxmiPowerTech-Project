import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import IndentTable from "./IndentTable";
import { materialCatalogAPI } from "../../utils/materialAPI";

export default function UploadIndent() {
  const [excelData, setExcelData] = useState({});
  const [selectedSheet, setSelectedSheet] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch last uploaded Excel on mount
  useEffect(() => {
    const fetchLastExcel = async () => {
      try {
        const data = await materialCatalogAPI.getLastExcel();
        const excelData = data || {};
        setExcelData(excelData);

        const sheets = Object.keys(excelData);
        if (sheets.length > 0) setSelectedSheet(sheets[0]);
      } catch (err) {
        console.error("Failed to fetch last Excel:", err.message);
      }
    };
    fetchLastExcel();
  }, []);

  // Upload new Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const allSheets = {};
      workbook.SheetNames.forEach(sheetName => {
        const ws = workbook.Sheets[sheetName];
        allSheets[sheetName] = XLSX.utils.sheet_to_json(ws);
      });

      setExcelData(allSheets);
      setSelectedSheet(workbook.SheetNames[0]);

      await uploadToServer(file, allSheets);
    };
    reader.readAsArrayBuffer(file);
  };

const uploadToServer = async (file, parsedData) => {
  try {
    setUploading(true);

    await materialCatalogAPI.uploadExcel(file);

    alert("Excel uploaded successfully!");

    // Fetch last uploaded Excel again
    const data = await materialCatalogAPI.getLastExcel();
    setExcelData(data || {});
    const sheets = Object.keys(data || {});
    if (sheets.length > 0) setSelectedSheet(sheets[0]);
  } catch (error) {
    alert("Failed to upload Excel file.");
  } finally {
    setUploading(false);
  }
};

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Upload an Indent List / See Existing Indent List
          </h1>
          <p className="text-sm text-gray-500">Supported file: .xlsx</p>
        </div>

        <div>
          <label
            htmlFor="fileInput"
            className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition"
          >
            {uploading ? "Uploading..." : "Upload Excel"}
          </label>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </div>
      </div>

      {Object.keys(excelData).length > 0 && (
        <>
          <div className="flex items-center gap-4 mb-4">
            <label className="font-medium text-gray-700">Select Category:</label>
            <select
              className="border rounded p-2 focus:ring-2 focus:ring-orange-400"
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
            >
              {Object.keys(excelData).map(sheet => (
                <option key={sheet}>{sheet}</option>
              ))}
            </select>
          </div>

          <IndentTable data={excelData[selectedSheet] || []} />
        </>
      )}
    </div>
  );
}
