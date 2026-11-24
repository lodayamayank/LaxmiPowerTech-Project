// src/pages/team/MemberProfile.jsx  (route: /admin/my-team/:userId)
// One member: header, work details, personal details, pay and allowances, this month's attendance, profile completeness.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, KeyRound, Pencil, Phone } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate } from "@/lib/format";
import { getRoleTone } from "@/lib/status";
import { cn } from "@/lib/utils";
import EditUserModal from "./components/EditUserModal";
import useMemberProfile from "./components/useMemberProfile";

const NOT_ADDED = "Not added";
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

const Row = ({ label, children, onAdd }) => (
  <div className="grid grid-cols-3 gap-3 border-b border-line py-2.5 text-small last:border-b-0">
    <dt className="text-ink-3">{label}</dt>
    <dd className="col-span-2 flex items-center justify-between gap-2 break-words text-ink-1">
      {children || (onAdd ? <span className="text-ink-4">{NOT_ADDED}</span> : "—")}
      {!children && onAdd ? (
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          Add
        </Button>
      ) : null}
    </dd>
  </div>
);

const dayTone = (status = "") => {
  if (status === "Present" || status === "In Progress") return "bg-tone-ok-soft text-tone-ok-fg";
  if (status === "Absent") return "bg-tone-bad-soft text-tone-bad-fg";
  if (/Leave/.test(status)) return "bg-tone-warn-soft text-tone-warn-fg";
  return "bg-surface-muted text-ink-4";
};

const MemberProfile = () => {
  const { userId } = useParams();
  const p = useMemberProfile(userId);
  const { user, loading, error, reload, branches, projects, days, monthDate, resetPassword, projectName, branchNames } = p;
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 w-full lg:col-span-2" />
          <Skeleton className="h-72 w-full" />
        </div>
      </DashboardLayout>
    );
  }
  if (error || !user) {
    return (
      <DashboardLayout>
        <SectionCard>
          <EmptyState title={error || "Member not found"} action={<Button variant="outline" asChild><Link to={ROUTES.myTeam}>Back to My team</Link></Button>} />
        </SectionCard>
      </DashboardLayout>
    );
  }

  const open = () => setEditing(true);
  const active = !user.dateOfLeaving || new Date(user.dateOfLeaving) > new Date();
  const money = (v, suffix) => (v === undefined || v === null || v === "" ? "—" : `${formatCurrency(Number(v))}${suffix || ""}`);
  const counts = {
    present: days.filter((d) => d.status === "Present" || d.status === "In Progress").length,
    absent: days.filter((d) => d.status === "Absent").length,
    leave: days.filter((d) => /Leave/.test(d.status)).length,
  };
  const lead = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();

  const completeness = [
    ["Date of birth", user.dateOfBirth],
    ["Aadhaar number", user.aadhaarNumber],
    ["PAN number", user.panNumber],
    ["Driving licence", user.drivingLicense],
    ["Valid 10-digit mobile", /^\d{10}$/.test(String(user.mobileNumber || "")) ? user.mobileNumber : ""],
  ];
  const missing = completeness.filter(([, v]) => !v);
  const pct = Math.round(((completeness.length - missing.length) / completeness.length) * 100);

  return (
    <DashboardLayout>
      <Button variant="ghost" size="sm" className="-mb-2 self-start" asChild>
        <Link to={ROUTES.myTeam}>
          <ArrowLeft /> Back to My team
        </Link>
      </Button>

      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <UserAvatar name={user.name} size="lg" className="size-14" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-page-title text-ink-1">{user.name}</h1>
                <Badge variant={getRoleTone(user.role)} className="capitalize">{user.role}</Badge>
                {user.employeeType ? <Badge variant="neutral" className="capitalize">{user.employeeType}</Badge> : null}
                <Badge variant={active ? "ok" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="mt-1 text-small text-ink-3">
                @{user.username}
                {user.employeeId ? ` · ${user.employeeId}` : ""}
                {user.jobTitle || user.department ? ` · ${[user.jobTitle, user.department && `${user.department} department`].filter(Boolean).join(", ")}` : ""}
              </p>
              <p className="mt-1 text-small text-ink-3">
                {[projectName, user.dateOfJoining && `Joined ${formatDate(user.dateOfJoining)}`, user.personalEmail, user.standardDailyHours && `${user.standardDailyHours} h standard day`].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.mobileNumber ? (
              <Button variant="outline" asChild>
                <a href={`tel:${user.mobileNumber}`}>
                  <Phone /> Call
                </a>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <KeyRound /> Reset password
            </Button>
            <Button onClick={open}>
              <Pencil /> Edit profile
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Work details" actions={<Button variant="ghost" size="sm" onClick={open}>Edit</Button>}>
            <dl>
              <Row label="Role"><span className="capitalize">{user.role}</span></Row>
              <Row label="Employee type"><span className="capitalize">{user.employeeType}</span></Row>
              <Row label="Employee ID">{user.employeeId}</Row>
              <Row label="Department">{user.department}</Row>
              <Row label="Job title">{user.jobTitle}</Row>
              <Row label="Project">{projectName}</Row>
              <Row label="Branches">{branchNames.length ? branchNames.join(", ") : ""}</Row>
              <Row label="Date of joining">{user.dateOfJoining ? formatDate(user.dateOfJoining) : ""}</Row>
              <Row label="Date of leaving">{user.dateOfLeaving ? formatDate(user.dateOfLeaving) : ""}</Row>
            </dl>
          </SectionCard>

          <SectionCard title="Personal details" description="Only admins can see this section" actions={<Button variant="ghost" size="sm" onClick={open}>Edit</Button>}>
            <dl>
              <Row label="Mobile">{user.mobileNumber}</Row>
              <Row label="Personal email">{user.personalEmail}</Row>
              <Row label="Date of birth" onAdd={open}>{user.dateOfBirth ? formatDate(user.dateOfBirth) : ""}</Row>
              <Row label="Marital status">{user.maritalStatus}</Row>
              <Row label="Aadhaar" onAdd={open}>{user.aadhaarNumber}</Row>
              <Row label="PAN" onAdd={open}>{user.panNumber}</Row>
              <Row label="Driving licence" onAdd={open}>{user.drivingLicense}</Row>
              <Row label="Address">{user.address}</Row>
              <Row label="Emergency contact">{user.emergencyContact}</Row>
            </dl>
          </SectionCard>

          <SectionCard title="Pay & allowances" description="Used by the salary run" actions={<Button variant="ghost" size="sm" onClick={open}>Edit</Button>}>
            <dl>
              <Row label="CTC">{user.ctcAmount !== undefined && user.ctcAmount !== null ? `${money(user.ctcAmount)} · ${user.salaryType || "monthly"}` : ""}</Row>
              <Row label="Salary effective from">{user.salaryEffectiveDate ? formatDate(user.salaryEffectiveDate) : "Current"}</Row>
              <Row label="Travel allowance">{money(user.perDayTravelAllowance, " / working day")}</Row>
              <Row label="Railway pass">{money(user.railwayPassAmount, " / month")}</Row>
              <Row label="Standard day">{user.standardDailyHours ? `${user.standardDailyHours} hours` : ""}</Row>
              <Row label="Overtime rate">{user.overtimeRateMultiplier ? `${user.overtimeRateMultiplier}×` : ""}</Row>
              <Row label="Other amount">{user.otherAmount !== undefined && user.otherAmount !== null ? `${money(user.otherAmount)}${user.otherAmountType ? ` · ${user.otherAmountType}` : ""}` : ""}</Row>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Attendance this month" description={monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}>
            <div className="grid grid-cols-7 gap-1 text-center text-caption-lg">
              {WEEK.map((w, i) => (
                <div key={i} className="py-1 font-medium text-ink-3">{w}</div>
              ))}
              {Array.from({ length: lead }).map((_, i) => (
                <div key={`b${i}`} />
              ))}
              {days.map((d) => (
                <div key={d.date} title={`${d.date}: ${d.status}`} className={cn("rounded-control py-1.5 tabular-nums", dayTone(d.status))}>
                  {Number(String(d.date).slice(-2))}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-card-title tabular-nums text-tone-ok-fg">{counts.present}</div><div className="text-caption-lg text-ink-3">Present</div></div>
              <div><div className="text-card-title tabular-nums text-tone-bad-fg">{counts.absent}</div><div className="text-caption-lg text-ink-3">Absent</div></div>
              <div><div className="text-card-title tabular-nums text-tone-warn-fg">{counts.leave}</div><div className="text-caption-lg text-ink-3">Leave</div></div>
            </div>
          </SectionCard>

          <SectionCard title="Profile completeness" description={missing.length ? `${missing.length} detail${missing.length === 1 ? "" : "s"} missing` : "All set"}>
            <div className="mb-3 flex items-center gap-3">
              <Progress value={pct} className="h-2 flex-1" />
              <span className="text-small font-semibold tabular-nums text-ink-1">{pct}%</span>
            </div>
            <ul className="space-y-1">
              {missing.map(([label]) => (
                <li key={label} className="flex items-center justify-between text-small text-ink-2">
                  {label}
                  <Button type="button" variant="ghost" size="sm" onClick={open}>Add</Button>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      {editing && <EditUserModal user={user} branches={branches} projects={projects} onClose={() => setEditing(false)} onSave={() => { reload(); setEditing(false); }} />}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset password?"
        description={`Reset password for ${user.username} to default123?`}
        confirmLabel="Reset Password"
        onConfirm={async () => {
          await resetPassword(user.username);
          setConfirmReset(false);
        }}
      />
    </DashboardLayout>
  );
};

export default MemberProfile;
