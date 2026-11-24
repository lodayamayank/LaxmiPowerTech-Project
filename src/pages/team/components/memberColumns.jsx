// src/pages/team/components/memberColumns.jsx
// DataTable columns and mobile card for the My team list.
import { memo } from "react";
import { Link } from "react-router-dom";
import { Activity, KeyRound, MoreHorizontal, Pencil, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ROUTES } from "@/lib/routes";
import { getRoleTone } from "@/lib/status";

export const memberPath = (user) => `${ROUTES.myTeam}/${user._id}`;

const MemberCell = memo(function MemberCell({ user }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar name={user.name} />
      <div className="min-w-0">
        <Link to={memberPath(user)} className="block truncate font-medium text-ink-1 hover:text-primary">
          {user.name}
        </Link>
        <div className="truncate text-caption-lg text-ink-3">@{user.username}</div>
      </div>
    </div>
  );
});

const RoleBadge = memo(function RoleBadge({ user }) {
  return (
    <Badge variant={getRoleTone(user.role)} className="capitalize">
      {user.role}
    </Badge>
  );
});

/** View attendance, plus a menu with the other row actions (profile, edit, reset password, delete). */
const MemberActions = memo(function MemberActions({ user, onAttendance, onEdit, onReset, onDelete, full }) {
  return (
    <div className={full ? "flex gap-2" : "flex items-center justify-end gap-1"}>
      <Button variant="outline" size="sm" className={full ? "flex-1" : undefined} onClick={() => onAttendance(user)} title="Attendance graph">
        <Activity /> View Attendance
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-control-sm w-control-sm" aria-label={`More actions for ${user.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={memberPath(user)}>
              <UserRound /> View profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(user)}>
            <Pencil /> View / Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onReset(user)}>
            <KeyRound /> Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-tone-bad-fg focus:text-tone-bad-fg" onSelect={() => onDelete(user)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export function getMemberColumns(handlers) {
  return [
    { key: "member", header: "Member", cell: (u) => <MemberCell user={u} /> },
    { key: "mobile", header: "Mobile", cell: (u) => <span className="tabular-nums text-ink-2">{u.mobileNumber || "—"}</span> },
    { key: "role", header: "Role", cell: (u) => <RoleBadge user={u} /> },
    { key: "actions", header: "Actions", align: "right", sticky: "right", cell: (u) => <MemberActions user={u} {...handlers} /> },
  ];
}

/** Stacked card for one member (DataTable `mobileCard`, below md). */
export function getMemberMobileCard(handlers) {
  return function MemberMobileCard(u) {
    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <MemberCell user={u} />
          <RoleBadge user={u} />
        </div>
        <div className="text-small tabular-nums text-ink-3">{u.mobileNumber || "—"}</div>
        <MemberActions user={u} full {...handlers} />
      </>
    );
  };
}
