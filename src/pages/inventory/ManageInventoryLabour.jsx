// src/pages/inventory/ManageInventoryLabour.jsx  (route: Labour overview)
// Filters, requests and grouping live in components/useLabourOverview.js (moved unchanged); this file lays out the page.
import { Hourglass, HardHat, Plus, Users, Wallet, CircleCheck } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { Notice } from "@/components/common/Notice";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { ROUTES } from "@/lib/routes";
import LabourGroups from "./components/LabourGroups";
import useLabourOverview, { ALL } from "./components/useLabourOverview";

const TILE_ICONS = [Users, Wallet, CircleCheck, Hourglass];
const TILE_TONES = { default: "info", success: "ok", danger: "bad" };

const ManageInventoryLabour = () => {
  const o = useLabourOverview();
  const {
    navigate, branches, selectedBranch, setSelectedBranch, selectedProject, setSelectedProject, selectedMonth, setSelectedMonth, searchTerm,
    setSearchTerm, loading, error, expandedRow, setExpandedRow, branchProjects, month, year, groups, summaryCards, filterDescription,
  } = o;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Inventory / Labour overview"
        title="Labour overview"
        description="Monitor labour assignments and salaries across branches."
        actions={
          <Button type="button" onClick={() => navigate(ROUTES.myTeam, { state: { tab: "labour" } })}>
            <Plus /> Add Labour
          </Button>
        }
      />

      {error && <Notice tone="bad">{error}</Notice>}

      {summaryCards && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {summaryCards.map((card, i) => (
            <StatCard key={card.title} label={card.title} value={card.value} icon={TILE_ICONS[i]} tone={TILE_TONES[card.tone || "default"] || "info"} />
          ))}
        </div>
      )}

      <SectionCard title="Labour snapshot" description={filterDescription} flush>
        <FilterBar
          onClear={() => {
            setSelectedBranch(ALL);
            setSelectedProject(ALL);
            setSearchTerm("");
          }}
          showClear={selectedBranch !== ALL || selectedProject !== ALL || Boolean(searchTerm)}
        >
          <FilterField label="Branch" htmlFor="labour-filter-branch" grow={12} minWidth={160} maxWidth={240}>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger id="labour-filter-branch" aria-label="Select branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Project" htmlFor="labour-filter-project" grow={12} minWidth={160} maxWidth={240}>
            <Select value={selectedProject} onValueChange={setSelectedProject} disabled={selectedBranch === ALL}>
              <SelectTrigger id="labour-filter-project" aria-label="Select project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{selectedBranch === ALL ? "Select branch first" : "All Projects"}</SelectItem>
                {branchProjects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Month" htmlFor="labour-filter-month" minWidth={150} maxWidth={190}>
            <Input id="labour-filter-month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} aria-label="Select month" />
          </FilterField>
          <FilterField label="Search labour" htmlFor="labour-filter-search" grow={18} minWidth={200}>
            <SearchInput id="labour-filter-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm("")} placeholder="Search labour, branch..." />
          </FilterField>
        </FilterBar>

        {loading ? (
          <div className="space-y-3 p-5" aria-label="Loading labour data">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState icon={HardHat} title="No labour records found." description="Try adjusting the filters or add labour from the My Team module." />
        ) : (
          <LabourGroups groups={groups} month={month} year={year} expandedRow={expandedRow} setExpandedRow={setExpandedRow} />
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

export default ManageInventoryLabour;
