// src/pages/material/indent/UploadIndent.jsx  (route: /dashboard/material/uploadindent, the "Indent lists" tab)
// Laid out like the Indent lists design: a drop zone to upload the Excel indent list, then the uploaded list.
// State and requests live in components/useUploadIndent.js (moved unchanged).
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, FileX, Upload } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { cn } from "@/lib/utils";
import IndentTable from "./components/IndentTable";
import useUploadIndent from "./components/useUploadIndent";

export default function UploadIndent() {
  const u = useUploadIndent();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!u.uploading) u.uploadFile(e.dataTransfer.files?.[0]);
  };

  return (
    <DashboardLayout title="Upload Indent List">
      <PageHeader eyebrow="Inventory / Materials / Indent lists" title="Materials" description="Indents, purchase orders, transfers and goods receipts." />

      <SectionCard title="Upload indent list" description="Each row becomes a material line you can raise a purchase order from">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center gap-3 rounded-card border-2 border-dashed px-5 py-10 text-center transition-colors",
            dragging ? "border-primary bg-primary-soft" : "border-line-input bg-surface-subtle",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-card bg-tone-highlight-soft text-tone-highlight-fg">
            <Upload className="size-6" />
          </span>
          <div className="text-body-lg font-semibold text-ink-1">{u.uploading ? "Uploading..." : "Drop your indent list here"}</div>
          <div className="text-body text-ink-3">Excel (.xlsx) using the Laxmi Powertech template, up to 10 MB</div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" disabled={u.uploading} onClick={() => fileInputRef.current?.click()}>
              <Upload /> {u.uploading ? "Uploading..." : "Choose file"}
            </Button>
            <Button type="button" variant="outline" onClick={u.handleDownloadTemplate}>
              <Download /> Download template
            </Button>
          </div>
          <Input ref={fileInputRef} type="file" accept=".xlsx" aria-label="Upload indent list (.xlsx)" onChange={u.handleFileUpload} className="hidden" />
        </div>
      </SectionCard>

      {u.error ? (
        <Notice
          tone="bad"
          title="Error"
          action={
            <Button variant="outline" size="sm" onClick={u.loadLastExcel}>
              Try again
            </Button>
          }
        >
          {u.error}
        </Notice>
      ) : null}

      <SectionCard
        flush
        title="Uploaded lists"
        description={u.sheets.length ? `${u.sheets.length} ${u.sheets.length === 1 ? "category" : "categories"} in the last upload` : undefined}
        actions={
          u.sheets.length ? (
            <div className="w-56">
              <Select value={u.selectedSheet} onValueChange={u.setSelectedSheet}>
                <SelectTrigger aria-label="Select category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {u.sheets.map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
      >
        {u.loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : u.sheets.length ? (
          <IndentTable data={u.excelData[u.selectedSheet] || []} />
        ) : u.error ? (
          <EmptyState icon={FileX} title="Could not load the indent list" description="Check your connection and try again." />
        ) : (
          <EmptyState icon={FileSpreadsheet} title="No indent lists yet" description="Uploaded lists will appear here with their categories and rows." />
        )}
      </SectionCard>
    </DashboardLayout>
  );
}
