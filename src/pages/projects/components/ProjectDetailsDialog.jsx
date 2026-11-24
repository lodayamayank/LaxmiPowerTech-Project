// src/pages/projects/components/ProjectDetailsDialog.jsx
// Read-only project details (structure counts, team, approved-task progress). Figures come from useProjectsPage.
import { CheckCircle2, Clock, Layers, LineChart, ListChecks, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { getRoleTone } from "@/lib/status";
import LocationPath from "./LocationPath";

const DONE = ["completed", "verified", "approved"];
const num = (v) => <span className="tabular-nums">{v}</span>;
const NO_TASKS = <EmptyState title="No approved tasks yet" />;

const buildingColumns = (nameHeader, openOf) => [
  { key: "name", header: nameHeader, cell: (r) => <span className="font-medium text-ink-1">{r.name}</span> },
  { key: "total", header: "Total", align: "center", cell: (r) => num(r.total) },
  { key: "done", header: "Done", align: "center", cell: (r) => <span className="font-medium tabular-nums text-tone-ok-fg">{r.done}</span> },
  { key: "open", header: openOf.header, align: "center", cell: (r) => <span className="font-medium tabular-nums text-tone-warn-fg">{openOf.value(r)}</span> },
];

const Loading = () => (
  <div className="space-y-6 py-2" aria-label="Loading project details">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
    <Skeleton className="h-3 w-full" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  </div>
);

export default function ProjectDetailsDialog({ p }) {
  const { detailsProject: project, detailsLoading, closeDetails, detailProgress, detailTeam, detailStructure, buildingProgress, supervisorProgress, completedProjectTasks, getEffectiveTaskStatus } = p;
  if (!project) return null;

  const taskColumns = [
    { key: "location", header: "Location", nowrap: false, cell: (t) => <LocationPath parts={[t.building?.name, t.floor?.name, t.flat?.name, t.room?.name]} /> },
    { key: "activity", header: "Activity", cell: (t) => <span className="text-ink-3">{t.level3Activity?.name || "-"}</span> },
    { key: "supervisor", header: "Supervisor", cell: (t) => t.supervisor?.name || "N/A" },
    {
      key: "status",
      header: "Status",
      cell: (t) => {
        const status = getEffectiveTaskStatus(t);
        const isDone = DONE.includes(status);
        return (
          <Badge variant={isDone ? "ok" : status === "rejected" ? "bad" : "warn"} className="capitalize">
            {isDone ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
            {status.replace("-", " ")}
          </Badge>
        );
      },
    },
  ];
  const teamColumns = [
    {
      key: "member",
      header: "Name",
      cell: (m) => (
        <div>
          <div className="font-medium text-ink-1">{m.name}</div>
          <div className="text-caption-lg text-ink-3">@{m.username || "user"}</div>
        </div>
      ),
    },
    { key: "role", header: "Role", align: "right", cell: (m) => <Badge variant={getRoleTone(m.role)} className="capitalize">{m.role}</Badge> },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && closeDetails()}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden p-0">
        <DialogHeader className="border-b border-line px-6 py-4 text-left">
          <DialogTitle>{project.name}</DialogTitle>
          <DialogDescription>{project.address || "No address added"}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-100px)] space-y-6 overflow-y-auto px-6 pb-6">
          {detailsLoading ? (
            <Loading />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Completed tasks" value={detailProgress.total} icon={ListChecks} tone="info" />
                <StatCard label="Work done" value={`${detailProgress.percent}%`} icon={LineChart} tone="ok" />
                <StatCard label="Assigned team" value={detailTeam.length} icon={Users} tone="purple" />
                <StatCard label="Rooms planned" value={detailStructure.rooms} icon={Layers} tone="highlight" />
              </div>

              <div>
                <Progress value={detailProgress.percent} className="h-3 [&>div]:bg-tone-ok-fg" />
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(detailProgress.counts).map(([status, count]) => (
                    <Badge key={status} variant="neutral" className="capitalize">
                      {status.replace("-", " ")}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SectionCard title="Project info">
                  <div className="space-y-4">
                    <div>
                      <p className="text-caption-lg font-semibold uppercase text-ink-3">Branches</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {project.branches?.length > 0 ? (
                          project.branches.map((branch) => (
                            <Badge key={branch._id} variant="info">
                              <MapPin className="size-3" />
                              {branch.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-small text-ink-3">No branches assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Buildings", detailStructure.buildings],
                        ["Floors", detailStructure.floors],
                        ["Flats", detailStructure.flats],
                        ["Rooms", detailStructure.rooms],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-card bg-surface-muted p-3">
                          <p className="text-caption-lg text-ink-3">{label}</p>
                          <p className="text-card-title tabular-nums text-ink-1">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Assigned supervisors" flush>
                  <DataTable columns={teamColumns} rows={detailTeam} rowKey="_id" emptyState={<EmptyState title="No supervisors assigned to this project" />} />
                </SectionCard>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SectionCard title="Work by building" flush>
                  <DataTable columns={buildingColumns("Building", { header: "Pending", value: (r) => r.pending })} rows={buildingProgress} rowKey="name" emptyState={NO_TASKS} />
                </SectionCard>
                <SectionCard title="Work by supervisor" flush>
                  <DataTable columns={buildingColumns("Supervisor", { header: "Open", value: (r) => r.pending + r.inProgress })} rows={supervisorProgress} rowKey="name" emptyState={NO_TASKS} />
                </SectionCard>
              </div>

              <SectionCard title="Recent tasks" flush>
                <DataTable columns={taskColumns} rows={completedProjectTasks.slice(0, 8)} rowKey="_id" emptyState={NO_TASKS} />
              </SectionCard>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
