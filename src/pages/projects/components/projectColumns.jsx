// src/pages/projects/components/projectColumns.jsx
// DataTable columns and mobile card for the project list.
import { memo } from "react";
import { Building2, FolderOpen, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconTile } from "@/components/common/IconTile";

const MAX_BADGES = 2;

const ProjectCell = memo(function ProjectCell({ project }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={Building2} tone="neutral" />
      <span className="font-medium text-ink-1">{project.name}</span>
    </div>
  );
});

const BranchBadges = memo(function BranchBadges({ project }) {
  const branches = project.branches || [];
  if (branches.length === 0) return <span className="text-ink-3">N/A</span>;
  const extra = branches.length - MAX_BADGES;
  return (
    <div className="flex flex-wrap items-center gap-1" title={branches.map((b) => b.name).join(", ")}>
      {branches.slice(0, MAX_BADGES).map((b, idx) => (
        <Badge key={b._id || idx} variant="info">
          <MapPin className="size-3" />
          {b.name}
        </Badge>
      ))}
      {extra > 0 ? <Badge variant="neutral">+{extra}</Badge> : null}
    </div>
  );
});

/** Documents, View, plus a menu with the other row actions the page has (edit, delete). */
const ProjectActions = memo(function ProjectActions({ project, onDocuments, onView, onEdit, onDelete, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-1"}>
      <Button variant="ghost" size="sm" className={full ? "flex-1" : undefined} onClick={() => onDocuments(project)} title="Project documents">
        <FolderOpen /> Documents
      </Button>
      <Button variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onView(project)} title="View project details">
        View
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-control-sm w-control-sm" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(project)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-tone-bad-fg focus:text-tone-bad-fg" onSelect={() => onDelete(project._id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export function getProjectColumns(handlers) {
  return [
    { key: "name", header: "Project", cell: (p) => <ProjectCell project={p} /> },
    { key: "address", header: "Address", truncate: true, maxWidth: 360, cell: (p) => <span className="text-ink-2" title={p.address}>{p.address}</span> },
    { key: "branches", header: "Branches", cell: (p) => <BranchBadges project={p} /> },
    { key: "actions", header: "Actions", align: "right", sticky: "right", cell: (p) => <ProjectActions project={p} {...handlers} /> },
  ];
}

/** Stacked card for one project (DataTable `mobileCard`, below md). */
export function getProjectMobileCard(handlers) {
  return function ProjectMobileCard(project) {
    return (
      <>
        <ProjectCell project={project} />
        {project.address ? <div className="text-small text-ink-2">{project.address}</div> : null}
        <BranchBadges project={project} />
        <ProjectActions project={project} full {...handlers} />
      </>
    );
  };
}
