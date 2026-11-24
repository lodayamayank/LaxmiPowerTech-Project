// src/pages/team/MemberProfile.jsx  (route: /admin/my-team/:userId)
// One member, laid out like the Member profile design: header card, section tabs, work / personal / pay details,
// this month's attendance calendar and profile completeness.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ChartColumn, ChevronLeft, ChevronRight, Clock, FolderKanban, KeyRound, Mail, MoreHorizontal, Pencil, Phone, TriangleAlert } from "lucide-react";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import AttendanceGraphModal from "@/pages/attendance/components/AttendanceGraphModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ROUTES } from "@/lib/routes";
import { formatCurrency, formatDate } from "@/lib/format";
import { getRoleTone } from "@/lib/status";
import { cn } from "@/lib/utils";
import EditUserModal from "./components/EditUserModal";
import useMemberProfile from "./components/useMemberProfile";

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "attendance", label: "Attendance" },
  { value: "salary", label: "Salary" },
  { value: "leaves", label: "Leaves & claims" },
  { value: "security", label: "Security" },
];
const GRID = "grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-[18px]";

const Field = ({ label, children, onAdd }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <dt className="text-caption-lg font-medium text-ink-3">{label}</dt>
    <dd className="flex flex-wrap items-center gap-x-2 text-body font-medium text-ink-1">
      {children || (onAdd ? <span className="font-normal text-ink-3">Not added</span> : <span className="font-normal text-ink-3">—</span>)}
      {!children && onAdd ? (
        <Button type="button" variant="link" className="h-auto p-0 text-small font-semibold" onClick={onAdd}>
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
  return "bg-surface-muted text-ink-3";
};

const MemberProfile = () => {
  const { userId } = useParams();
  const p = useMemberProfile(userId);
  const { user, loading, error, reload, branches, projects, days, monthDate, shiftMonth, overtimeHours, resetPassword, projectName, branchNames } = p;
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-36 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
  const hasMoney = (v) => v !== undefined && v !== null && v !== "";
  const money = (v, suffix = "") => (hasMoney(v) ? `${formatCurrency(Number(v))}${suffix}` : "");
  const mobileOk = /^\d{10}$/.test(String(user.mobileNumber || "").replace(/\s/g, ""));
  const counts = {
    present: days.filter((d) => d.status === "Present" || d.status === "In Progress").length,
    absent: days.filter((d) => d.status === "Absent").length,
    leave: days.filter((d) => /Leave/.test(d.status)).length,
  };
  const todayKey = new Date().toISOString().slice(0, 10);
  const lead = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();
  const completeness = [
    ["Date of birth", user.dateOfBirth],
    ["Aadhaar number", user.aadhaarNumber],
    ["PAN number", user.panNumber],
    ["Driving licence", user.drivingLicense],
    ["Valid 10-digit mobile", mobileOk ? user.mobileNumber : ""],
  ];
  const missing = completeness.filter(([, v]) => !v);
  const pct = Math.round(((completeness.length - missing.length) / completeness.length) * 100);

  const workDetails = (
    <SectionCard title="Work details" actions={<Button variant="ghost" size="sm" onClick={open}><Pencil /> Edit</Button>}>
      <dl className={GRID}>
        <Field label="Role"><Badge variant={getRoleTone(user.role)} className="capitalize">{user.role}</Badge></Field>
        <Field label="Employee type"><span className="capitalize">{user.employeeType}</span></Field>
        <Field label="Employee ID">{user.employeeId ? <span className="font-data text-small">{user.employeeId}</span> : null}</Field>
        <Field label="Department">{user.department}</Field>
        <Field label="Job title">{user.jobTitle}</Field>
        <Field label="Project">{projectName}</Field>
        <Field label="Branches">{branchNames.length ? <span className="flex flex-wrap gap-1.5">{branchNames.map((b) => <Badge key={b} variant="neutral">{b}</Badge>)}</span> : null}</Field>
        <Field label="Date of joining">{user.dateOfJoining ? formatDate(user.dateOfJoining) : null}</Field>
        <Field label="Date of leaving">{user.dateOfLeaving ? formatDate(user.dateOfLeaving) : null}</Field>
      </dl>
    </SectionCard>
  );

  const personalDetails = (
    <SectionCard title="Personal details" description="Only admins can see this section" actions={<Button variant="ghost" size="sm" onClick={open}><Pencil /> Edit</Button>}>
      <dl className={GRID}>
        <Field label="Mobile">
          {user.mobileNumber ? (
            <>
              <span className="tabular-nums">{user.mobileNumber}</span>
              {!mobileOk ? <Badge variant="warn">Check number</Badge> : null}
            </>
          ) : null}
        </Field>
        <Field label="Personal email">{user.personalEmail}</Field>
        <Field label="Date of birth" onAdd={open}>{user.dateOfBirth ? formatDate(user.dateOfBirth) : null}</Field>
        <Field label="Marital status">{user.maritalStatus}</Field>
        <Field label="Aadhaar" onAdd={open}>{user.aadhaarNumber}</Field>
        <Field label="PAN" onAdd={open}>{user.panNumber}</Field>
        <Field label="Driving licence" onAdd={open}>{user.drivingLicense}</Field>
        <Field label="Address">{user.address}</Field>
        <Field label="Emergency contact">{user.emergencyContact}</Field>
      </dl>
    </SectionCard>
  );

  const payDetails = (
    <SectionCard title="Pay & allowances" description="Used by the salary run" actions={<Button variant="ghost" size="sm" onClick={open}><Pencil /> Edit</Button>}>
      <dl className={GRID}>
        <Field label="CTC">
          {hasMoney(user.ctcAmount) ? (
            <>
              <span className="tabular-nums">{money(user.ctcAmount)} · {user.salaryType || "monthly"}</span>
              {!Number(user.ctcAmount) ? <Badge variant="warn">Not set</Badge> : null}
            </>
          ) : null}
        </Field>
        <Field label="Salary effective from">{user.salaryEffectiveDate ? formatDate(user.salaryEffectiveDate) : "Current"}</Field>
        <Field label="Travel allowance">{money(user.perDayTravelAllowance, " / working day")}</Field>
        <Field label="Railway pass">{money(user.railwayPassAmount, " / month")}</Field>
        <Field label="Standard day">{user.standardDailyHours ? `${user.standardDailyHours} hours` : null}</Field>
        <Field label="Overtime rate">{user.overtimeRateMultiplier ? `${Number(user.overtimeRateMultiplier).toFixed(1)}×${Number(user.overtimeRateMultiplier) === 1 ? " (normal rate)" : ""}` : null}</Field>
        <Field label="Other amount">{hasMoney(user.otherAmount) ? `${money(user.otherAmount)}${user.otherAmountType ? ` · ${user.otherAmountType}` : ""}` : null}</Field>
      </dl>
    </SectionCard>
  );

  const calendar = (
    <SectionCard
      title={monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      description="Attendance this month"
      actions={
        <>
          <Button variant="outline" size="icon" className="h-control-sm w-control-sm" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" className="h-control-sm w-control-sm" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight /></Button>
        </>
      }
    >
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK.map((w, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-ink-3">{w}</div>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((d) => (
          <div key={d.date} title={`${d.date} · ${d.status}`} className={cn("flex h-[34px] items-center justify-center rounded-[7px] text-[12.5px] font-semibold tabular-nums", dayTone(d.status), d.date === todayKey && "ring-1 ring-primary")}>
            {Number(String(d.date).slice(-2))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-caption-lg text-ink-3">
        {[["Present", "bg-tone-ok-soft"], ["Absent", "bg-tone-bad-soft"], ["Leave", "bg-tone-warn-soft"], ["Upcoming", "bg-surface-muted"]].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className={cn("size-2.5 rounded-sm", c)} />{l}</span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[[counts.present, "Present", "text-tone-ok-fg"], [counts.absent, "Absent", "text-tone-bad-fg"], [counts.leave, "Leave", "text-tone-warn-fg"], [`${Math.round(overtimeHours * 10) / 10} h`, "Overtime", "text-ink-1"]].map(([v, l, c]) => (
          <div key={l} className="rounded-card bg-surface-muted py-2">
            <div className={cn("text-[20px] font-semibold tabular-nums", c)}>{v}</div>
            <div className="text-[11.5px] text-ink-3">{l}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const completenessCard = (
    <SectionCard title="Profile completeness" description={missing.length ? `${missing.length} detail${missing.length === 1 ? "" : "s"} missing` : "All set"}>
      <div className="mb-3.5 flex items-center gap-3">
        <Progress value={pct} className="h-1.5 flex-1" />
        <span className="font-semibold tabular-nums text-ink-1">{pct}%</span>
      </div>
      <ul className="flex flex-col gap-2.5 text-body">
        {missing.map(([label]) => (
          <li key={label} className="flex items-center gap-2.5">
            <TriangleAlert className="size-4 text-tone-warn-fg" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            <Button type="button" variant="link" className="h-auto p-0 text-small font-semibold" onClick={open}>Add</Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );

  return (
    <DashboardLayout>
      <Link to={ROUTES.myTeam} className="inline-flex w-max items-center gap-1.5 text-body font-semibold text-primary hover:text-primary-strong">
        <ArrowLeft className="size-4" /> Back to My team
      </Link>

      <SectionCard bodyClassName="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <UserAvatar name={user.name} tone="purple" className="size-[72px] rounded-2xl text-[22px]" />
          <div className="flex min-w-[320px] flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] font-semibold tracking-tight text-primary">{user.name}</h1>
              <Badge variant={getRoleTone(user.role)} className="capitalize">{user.role}</Badge>
              {user.employeeType ? <Badge variant="neutral" className="capitalize">{user.employeeType}</Badge> : null}
              <Badge variant={active ? "ok" : "neutral"} dot>{active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="text-body text-ink-3">
              @{user.username}
              {user.employeeId ? <> · <span className="font-data text-small">{user.employeeId}</span></> : null}
              {user.jobTitle || user.department ? ` · ${[user.jobTitle, user.department && `${user.department} department`].filter(Boolean).join(", ")}` : ""}
            </div>
            <div className="flex flex-wrap gap-x-[18px] gap-y-1 text-[13.5px] text-ink-2">
              {projectName ? <span className="inline-flex items-center gap-1.5"><FolderKanban className="size-4 text-ink-3" />{projectName}</span> : null}
              {user.dateOfJoining ? <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-ink-3" />Joined {formatDate(user.dateOfJoining)}</span> : null}
              {user.personalEmail ? <span className="inline-flex items-center gap-1.5"><Mail className="size-4 text-ink-3" />{user.personalEmail}</span> : null}
              {user.standardDailyHours ? <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-ink-3" />{user.standardDailyHours} h standard day</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!user.mobileNumber} asChild={Boolean(user.mobileNumber)}>
              {user.mobileNumber ? <a href={`tel:${user.mobileNumber}`}><Phone /> Call</a> : <span><Phone /> Call</span>}
            </Button>
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <KeyRound /> Reset password
            </Button>
            <Button onClick={open}>
              <Pencil /> Edit profile
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`More actions for ${user.name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setGraphOpen(true)}><ChartColumn /> Attendance graph</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SectionCard>

      <UnderlineTabs aria-label="Sections" value={tab} onChange={setTab} options={TABS} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            {workDetails}
            {personalDetails}
            {payDetails}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {calendar}
            {completenessCard}
          </div>
        </div>
      )}
      {tab === "attendance" && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">{calendar}</div>
          <SectionCard title="Attendance graph" description="Daily, weekly, monthly and yearly view">
            <Button onClick={() => setGraphOpen(true)}><ChartColumn /> Open graph</Button>
          </SectionCard>
        </div>
      )}
      {tab === "salary" && <div className="max-w-3xl">{payDetails}</div>}
      {tab === "leaves" && (
        <SectionCard title="Leaves & claims" description="Requests are handled on their own pages.">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link to={ROUTES.attendance.leaves}>Open Leaves</Link></Button>
            <Button variant="outline" asChild><Link to={ROUTES.adminReimbursements}>Open Reimbursements</Link></Button>
          </div>
        </SectionCard>
      )}
      {tab === "security" && (
        <SectionCard title="Security" description="Passwords are never shown. Reset it if they can't sign in.">
          <Button variant="outline" onClick={() => setConfirmReset(true)}><KeyRound /> Reset password</Button>
        </SectionCard>
      )}

      {editing && <EditUserModal user={user} branches={branches} projects={projects} onClose={() => setEditing(false)} onSave={() => { reload(); setEditing(false); }} />}
      {graphOpen && <AttendanceGraphModal user={user} onClose={() => setGraphOpen(false)} />}

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
