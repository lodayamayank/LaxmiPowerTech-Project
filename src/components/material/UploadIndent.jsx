import { useState, useEffect, useRef, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // or your toast lib

  import IndentTable from "./IndentTable";
  import { materialCatalogAPI } from "../../utils/materialAPI";
import DashboardLayout from "../../layouts/DashboardLayout";

const MAX_SIZE_MB = 10;

export default function UploadIndent() {
  const [excelData, setExcelData] = useState({});
  const [selectedSheet, setSelectedSheet] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const loadLastExcel = useCallback(async () => {
    try {
      setError("");
      const data = (await materialCatalogAPI.getLastExcel()) || {};
      setExcelData(data);
      setSelectedSheet(Object.keys(data)[0] || "");
    } catch (err) {
      console.error("Failed to fetch last Excel:", err);
      setError("Could not load the existing indent list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLastExcel();
  }, [loadLastExcel]);

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/templates/Indent_Upload_Template_v2.xlsx";
    link.download = "Indent_Upload_Template_v2.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Please select an .xlsx file.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_SIZE_MB} MB.`);
      return;
    }

    try {
      setUploading(true);
      await materialCatalogAPI.uploadExcel(file);
      await loadLastExcel();
      toast.success("Excel uploaded successfully!");
    } catch (err) {
      console.error("Failed to upload Excel:", err);
      toast.error("Failed to upload Excel file.");
    } finally {
      setUploading(false);
    }
  };

  const sheets = Object.keys(excelData);

  return (
    <DashboardLayout title="Upload Indent List">
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Upload an Indent List / See Existing Indent List
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Supported file: .xlsx
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Download size={17} />
              Download Template
            </Button>

            <Button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {uploading ? "Uploading..." : "Upload Excel"}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {sheets.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <label
                htmlFor="sheetSelect"
                className="font-medium text-gray-700 dark:text-gray-200"
              >
                Select Category:
              </label>
              <select
                id="sheetSelect"
                className="border rounded p-2 bg-background text-foreground focus:ring-2 focus:ring-orange-400"
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
              >
                {sheets.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </div>

            <IndentTable data={excelData[selectedSheet] || []} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
