// src/pages/projects/components/taskColumns.jsx
// DataTable columns and mobile card for the task list.
import { memo } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/UserAvatar";
import { formatDate } from "@/lib/format";
import LocationPath from "./LocationPath";

const locationParts = (task) => [task.building?.name, task.wing?.name, task.floor?.name, task.flat?.name, task.room?.name];

const ProjectCell = memo(function ProjectCell({ task }) {
  return (
    <div>
      <div className="font-medium text-ink-1">{task.project?.name || "N/A"}</div>
      {task.branch ? <div className="text-caption-lg text-ink-3">{task.branch.name}</div> : null}
    </div>
  );
});

const LocationCell = memo(function LocationCell({ task }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <LocationPath parts={locationParts(task)} />
      {task.level3Activity?.name ? <Badge variant="info">{task.level3Activity.name}</Badge> : null}
    </div>
  );
});

const AssigneeCell = memo(function AssigneeCell({ task }) {
  return (
    <div className="flex items-center gap-2.5">
      <UserAvatar name={task.supervisor?.name} size="sm" />
      <div className="min-w-0">
        <div className="font-medium leading-tight text-ink-1">{task.supervisor?.name || "N/A"}</div>
        <div className="text-caption-lg capitalize text-ink-3">{task.supervisor?.role}</div>
      </div>
    </div>
  );
});

/** View, plus a menu with the other row actions the page has (edit, delete). */
const TaskActions = memo(function TaskActions({ task, onView, onEdit, onDelete, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-1"}>
      <Button variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onView(task)}>
        View
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-control-sm w-control-sm" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(task)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-tone-bad-fg focus:text-tone-bad-fg" onSelect={() => onDelete(task)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export function getTaskColumns(handlers) {
  return [
    { key: "project", header: "Project", cell: (task) => <ProjectCell task={task} /> },
    { key: "location", header: "Location", nowrap: false, cell: (task) => <LocationCell task={task} /> },
    { key: "assigned", header: "Assigned to", cell: (task) => <AssigneeCell task={task} /> },
    { key: "created", header: "Created", cell: (task) => <span className="tabular-nums">{formatDate(task.createdAt, { withTime: true })}</span> },
    { key: "actions", header: "Actions", align: "right", sticky: "right", cell: (task) => <TaskActions task={task} {...handlers} /> },
  ];
}

/** Stacked card for one task (DataTable `mobileCard`, below md). */
export function getTaskMobileCard(handlers) {
  return function TaskMobileCard(task) {
    return (
      <>
        <ProjectCell task={task} />
        <LocationCell task={task} />
        <div className="flex items-center justify-between gap-3">
          <AssigneeCell task={task} />
          <span className="text-caption-lg tabular-nums text-ink-3">{formatDate(task.createdAt, { withTime: true })}</span>
        </div>
        <TaskActions task={task} full {...handlers} />
      </>
    );
  };
}
