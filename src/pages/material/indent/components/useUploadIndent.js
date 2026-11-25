// src/pages/material/indent/components/useUploadIndent.js
// State and requests of the admin Upload indent list page: load the last uploaded Excel, download the template,
// validate and upload an .xlsx. Moved unchanged from UploadIndent.jsx; the only addition is `uploadFile(file)` so a
// dropped file goes through the same checks as a chosen one (handleFileUpload is the old input handler on top of it).
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { materialCatalogAPI } from "@/api/material";

const MAX_SIZE_MB = 10;

export default function useUploadIndent() {
  const [excelData, setExcelData] = useState({});
  const [selectedSheet, setSelectedSheet] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  const uploadFile = async (file) => {
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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    await uploadFile(file);
  };

  return {
    excelData, selectedSheet, setSelectedSheet, loading, uploading, error, sheets: Object.keys(excelData),
    loadLastExcel, handleDownloadTemplate, handleFileUpload, uploadFile,
  };
}
