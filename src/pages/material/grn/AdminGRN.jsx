// src/pages/material/grn/AdminGRN.jsx  (route: /dashboard/material/grn)
// Laid out like the GRN design. State, requests, analytics, billing save and exports live in
// components/useAdminGrn.js, the details / billing dialog in components/GrnDetailsDialog.jsx.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Eye, FileSpreadsheet, FileText, IndianRupee, Layers, PackageCheck, Receipt } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import GrnDetailsDialog from "./components/GrnDetailsDialog";
import useAdminGrn from "./components/useAdminGrn";
import { PAYMENT_TONE } from "./components/grnShared";

const ALL = "all";
const PAGE_SIZES = [10, 25, 50, 100];

export default function AdminGRN() {
  const g = useAdminGrn();
  const { deliveries, filteredDeliveries, loading, analytics, showAnalytics, search, setSearch, filterSite, setFilterSite, filterType, setFilterType, filterInvoiceNumber, setFilterInvoiceNumber, filterStatus, setFilterStatus, filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo } = g;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => setPage(1), [filteredDeliveries]);

  const hasFilters = Boolean(filterSite || filterType || filterInvoiceNumber || filterStatus || filterDateFrom || filterDateTo);
  const clearFilters = () => {
    setFilterSite("");
    setFilterType("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterInvoiceNumber("");
  };

  // One row per material line (a delivery without items is one row).
  const lines = useMemo(
    () =>
      filteredDeliveries.flatMap((delivery, deliveryIndex) =>
        delivery.items && delivery.items.length > 0
          ? delivery.items.map((item, itemIndex) => ({ key: `${delivery._id}-${itemIndex}`, delivery, item, srNo: deliveryIndex * 100 + itemIndex + 1 }))
          : [{ key: String(delivery._id), delivery, item: null, srNo: deliveryIndex + 1 }]
      ),
    [filteredDeliveries]
  );
  const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
  const pageLines = lines.slice((page - 1) * pageSize, page * pageSize);

  const siteRows = analytics.siteSummary.slice(0, 10);
  const maxSpend = Math.max(0, ...siteRows.map((s) => s.totalAmount));
  const siteColumns = [
    { key: "site", header: "Site", cell: (s) => <span className="font-medium text-ink-1">{s.siteName}</span> },
    {
      key: "spend",
      header: "Spend",
      cell: (s) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <Progress value={maxSpend > 0 ? (s.totalAmount / maxSpend) * 100 : 0} className="flex-1" />
          <span className="min-w-[96px] text-right font-semibold tabular-nums text-ink-1">{formatCurrency(s.totalAmount)}</span>
        </div>
      ),
    },
    { key: "grns", header: "GRNs", align: "right", cell: (s) => <span className="tabular-nums">{s.grnCount}</span> },
    { key: "materials", header: "Materials", align: "right", cell: (s) => <span className="tabular-nums">{s.materialCount}</span> },
    { key: "invoices", header: "Invoices", align: "right", cell: (s) => <span className="tabular-nums">{s.invoiceCount}</span> },
  ];

  const columns = [
    { key: "sr", header: "#", cell: (l) => <span className="tabular-nums text-ink-3">{l.srNo}</span> },
    { key: "invoice", header: "Invoice", cell: (l) => <span className="font-data text-ink-1">{l.delivery.billing?.invoiceNumber || "-"}</span> },
    { key: "date", header: "Date", cell: (l) => <span className="text-small text-ink-3">{formatDate(l.delivery.billing?.billDate || l.delivery.createdAt)}</span> },
    {
      key: "material",
      header: "Material",
      nowrap: false,
      cell: (l) =>
        l.item ? (
          <span className="block max-w-[220px]">{[l.item.category || l.item.name, l.item.sub_category, l.item.sub_category1].filter(Boolean).join(" · ") || "-"}</span>
        ) : (
          <span className="text-ink-3">No items</span>
        ),
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      cell: (l) => (l.item ? <span className="tabular-nums">{`${l.item.received_quantity || l.item.quantity || l.item.st_quantity || 0} ${l.item.uom || ""}`}</span> : "-"),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (l) => {
        const mb = l.item && l.delivery.billing?.materialBilling?.find((m) => m.materialName === l.item.name || m.materialName === l.item.category);
        return <span className="font-semibold tabular-nums text-ink-1">{mb?.totalAmount ? formatCurrency(mb.totalAmount) : "-"}</span>;
      },
    },
    {
      key: "payment",
      header: "Payment",
      cell: (l) => {
        const ps = g.getPaymentSummary(l.delivery.billing);
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={ps.paymentStatus} tone={PAYMENT_TONE[ps.paymentStatus] || "bad"} label={g.getPaymentStatusLabel(ps.paymentStatus)} />
            <span className="text-caption text-ink-3">Paid {formatCurrency(ps.paidAmount)}</span>
          </div>
        );
      },
    },
    { key: "project", header: "Project", cell: (l) => l.delivery.to || "-" },
    { key: "vendor", header: "Vendor", cell: (l) => <span className="text-ink-3">{l.delivery.from || l.delivery.vendor || "-"}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (l) => (
        <Button variant="ghost" size="icon" aria-label={`View details for ${l.delivery.transfer_number || l.delivery.st_id}`} onClick={() => g.handleViewDetails(l.delivery)}>
          <Eye />
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="GRN (Goods Receipt Note)">
      <PageHeader eyebrow="Inventory / Materials / GRN" title="Materials" description="Indents, purchase orders, transfers and goods receipts." />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard icon={PackageCheck} tone="neutral" label="GRNs" value={analytics.totalGRNs} sub="Completed deliveries" />
        <StatCard icon={Receipt} tone="neutral" label="Invoices" value={analytics.totalInvoices} sub="Unique invoice numbers" />
        <StatCard icon={IndianRupee} tone="highlight" label="Total spend" value={formatCurrency(analytics.totalSpend)} />
        <StatCard icon={Layers} tone="neutral" label="Material lines" value={analytics.totalMaterials} />
      </div>

      <SectionCard
        flush
        title="Spend by site"
        description="Totals delivered to each site"
        actions={
          <Button variant="ghost" size="sm" onClick={() => g.setShowAnalytics(!showAnalytics)} aria-expanded={showAnalytics}>
            {showAnalytics ? <ChevronUp /> : <ChevronDown />} {showAnalytics ? "Hide" : "Show"}
          </Button>
        }
      >
        {showAnalytics ? <DataTable columns={siteColumns} rows={siteRows} rowKey="siteName" loading={loading} density="list" emptyState={<EmptyState title="No sites found" />} /> : null}
      </SectionCard>

      <SectionCard
        flush
        title={`GRN records (${filteredDeliveries.length} of ${deliveries.length} records)`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={g.handleExportExcel}>
                <FileSpreadsheet /> Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={g.handleExportPDF}>
                <FileText /> Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <FilterBar onClear={clearFilters} showClear={hasFilters}>
          <FilterField label="Search" htmlFor="grn-search" grow={22} minWidth={220}>
            <SearchInput id="grn-search" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} placeholder="Search by ID, site..." />
          </FilterField>
          <FilterField label="Site" htmlFor="grn-site" grow={12} minWidth={160} maxWidth={260}>
            <Select value={filterSite || ALL} onValueChange={(v) => setFilterSite(v === ALL ? "" : v)}>
              <SelectTrigger id="grn-site">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Sites</SelectItem>
                {g.sites.map((site) => (
                  <SelectItem key={site} value={site}>
                    {site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Type" htmlFor="grn-type" grow={8} minWidth={150} maxWidth={200}>
            <Select value={filterType || ALL} onValueChange={(v) => setFilterType(v === ALL ? "" : v)}>
              <SelectTrigger id="grn-type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Types</SelectItem>
                <SelectItem value="Site Transfer">Site Transfer</SelectItem>
                <SelectItem value="Intent">Intent</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Invoice number" htmlFor="grn-invoice-filter" grow={10} minWidth={160} maxWidth={240}>
            <Input id="grn-invoice-filter" type="text" value={filterInvoiceNumber} onChange={(e) => setFilterInvoiceNumber(e.target.value)} placeholder="Search invoice..." />
          </FilterField>
          <FilterField label="Payment" htmlFor="grn-payment" grow={8} minWidth={150} maxWidth={210}>
            <Select value={filterStatus || ALL} onValueChange={(v) => setFilterStatus(v === ALL ? "" : v)}>
              <SelectTrigger id="grn-payment">
                <SelectValue placeholder="All payments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Payments</SelectItem>
                <SelectItem value="pending">Pending Payment</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
                <SelectItem value="complete">Complete Payment</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="From date" htmlFor="grn-from" grow={7} minWidth={150} maxWidth={190}>
            <Input id="grn-from" type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </FilterField>
          <FilterField label="To date" htmlFor="grn-to" grow={7} minWidth={150} maxWidth={190}>
            <Input id="grn-to" type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </FilterField>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={pageLines}
          rowKey="key"
          loading={loading}
          density="list"
          emptyState={<EmptyState icon={PackageCheck} title={deliveries.length === 0 ? "No completed deliveries found" : "No GRN records match"} description={deliveries.length === 0 ? undefined : "Try a different search or clear the filters."} />}
          footer={
            lines.length > 0 ? (
              <PaginationBar
                variant="compact"
                itemNoun="GRN lines"
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={lines.length}
                pageSize={pageSize}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
                pageSizeOptions={PAGE_SIZES}
              />
            ) : null
          }
        />
      </SectionCard>

      <GrnDetailsDialog g={g} />
    </DashboardLayout>
  );
}
