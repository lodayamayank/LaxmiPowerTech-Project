import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { Inbox, Users, Wallet, Clock, Plus, Trash2, Search, Moon, Sun, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ProgressRow } from "@/components/common/ProgressRow";
import { UserAvatar } from "@/components/common/UserAvatar";
import { IconTile } from "@/components/common/IconTile";
import { DataTable } from "@/components/common/DataTable";
import { PaginationBar } from "@/components/common/PaginationBar";
import { FormField } from "@/components/common/FormField";
import { SearchInput } from "@/components/common/SearchInput";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/format";

const TONES = ["ok", "warn", "bad", "info", "neutral", "highlight", "purple", "pink"];

// Literal class names so Tailwind generates them.
const SWATCH_GROUPS = [
  {
    name: "Brand",
    items: [
      ["primary", "bg-primary"],
      ["primary-strong", "bg-primary-strong"],
      ["primary-soft", "bg-primary-soft"],
    ],
  },
  {
    name: "Highlight",
    items: [
      ["highlight", "bg-highlight"],
      ["highlight-foreground", "bg-highlight-foreground"],
      ["highlight-soft", "bg-highlight-soft"],
    ],
  },
  {
    name: "Surfaces",
    items: [
      ["page", "bg-page"],
      ["surface", "bg-surface"],
      ["surface-subtle", "bg-surface-subtle"],
      ["surface-muted", "bg-surface-muted"],
    ],
  },
  {
    name: "Lines",
    items: [
      ["line", "bg-line"],
      ["line-card", "bg-line-card"],
      ["line-input", "bg-line-input"],
    ],
  },
  {
    name: "Ink",
    items: [
      ["ink-1", "bg-ink-1"],
      ["ink-2", "bg-ink-2"],
      ["ink-3", "bg-ink-3"],
      ["ink-4", "bg-ink-4"],
      ["ink-5", "bg-ink-5"],
    ],
  },
  {
    name: "tone-ok / tone-warn",
    items: [
      ["tone-ok-soft", "bg-tone-ok-soft"],
      ["tone-ok-fg", "bg-tone-ok-fg"],
      ["tone-ok-border", "bg-tone-ok-border"],
      ["tone-warn-soft", "bg-tone-warn-soft"],
      ["tone-warn-fg", "bg-tone-warn-fg"],
    ],
  },
  {
    name: "tone-bad / tone-info",
    items: [
      ["tone-bad-soft", "bg-tone-bad-soft"],
      ["tone-bad-fg", "bg-tone-bad-fg"],
      ["tone-bad-border", "bg-tone-bad-border"],
      ["tone-bad-solid", "bg-tone-bad-solid"],
      ["tone-info-soft", "bg-tone-info-soft"],
      ["tone-info-fg", "bg-tone-info-fg"],
    ],
  },
  {
    name: "tone-neutral / highlight / purple / pink",
    items: [
      ["tone-neutral-soft", "bg-tone-neutral-soft"],
      ["tone-neutral-fg", "bg-tone-neutral-fg"],
      ["tone-highlight-soft", "bg-tone-highlight-soft"],
      ["tone-highlight-fg", "bg-tone-highlight-fg"],
      ["tone-purple-soft", "bg-tone-purple-soft"],
      ["tone-purple-fg", "bg-tone-purple-fg"],
      ["tone-pink-soft", "bg-tone-pink-soft"],
      ["tone-pink-fg", "bg-tone-pink-fg"],
    ],
  },
];

const TYPE_SAMPLES = [
  ["text-caption (12)", "text-caption"],
  ["text-caption-lg (12.5)", "text-caption-lg"],
  ["text-small (13)", "text-small"],
  ["text-body (14)", "text-body"],
  ["text-card-title (16)", "text-card-title"],
  ["text-page-title (26)", "text-page-title"],
  ["text-kpi (28)", "text-kpi"],
];

const STATUSES = [
  "Approved",
  "Pending",
  "Rejected",
  "Paid",
  "In Progress",
  "Partial",
  "Cancelled",
  "Draft",
  "Present",
  "Sick Leave",
];

const SAMPLE_ROWS = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: ["Anil Kumar", "Meera Shah", "Rahul Verma", "Sneha Patil", "Vikram Rao"][i % 5],
  project: ["Tower A", "Tower B", "Podium", "Basement"][i % 4],
  status: STATUSES[i % STATUSES.length],
  amount: 1250 * (i + 1) + (i % 3 === 0 ? 0.5 : 0),
  date: new Date(2026, 8, 1 + (i % 28)).toISOString(),
}));

const TABLE_COLUMNS = [
  {
    key: "name",
    header: "Employee",
    cell: (r) => (
      <div className="flex items-center gap-2.5">
        <UserAvatar name={r.name} size="sm" />
        <span className="font-medium text-ink-1">{r.name}</span>
      </div>
    ),
  },
  { key: "project", header: "Project" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  { key: "date", header: "Date", cell: (r) => formatDate(r.date) },
  { key: "amount", header: "Amount", align: "right", cell: (r) => <span className="tabular-nums">{formatCurrency(r.amount)}</span> },
];

const Swatch = ({ name, cls }) => (
  <div className="flex items-center gap-2.5">
    <div className={`h-9 w-9 shrink-0 rounded-control border border-line-card ${cls}`} />
    <div className="min-w-0 text-caption text-ink-3">
      <div className="truncate font-semibold text-ink-2">{name}</div>
      <div className="truncate">{cls}</div>
    </div>
  </div>
);

const Row = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    {label ? <div className="text-caption font-semibold uppercase tracking-wide text-ink-4">{label}</div> : null}
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

export default function Styleguide() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [seg, setSeg] = useState("week");
  const [segSm, setSegSm] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const totalPages = Math.ceil(SAMPLE_ROWS.length / pageSize);
  const pageRows = SAMPLE_ROWS.slice((page - 1) * pageSize, page * pageSize);

  const confirm = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-page text-ink-1">
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line-card bg-surface px-5 py-3">
        <div className="text-card-title text-ink-1">Styleguide</div>
        <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)}>
          {dark ? <Sun /> : <Moon />}
          {dark ? "Light" : "Dark"}
        </Button>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-6">
        <PageHeader
          eyebrow="Design system"
          title="Components and tokens"
          description="Dev-only page. Every block below uses shared components and tokens only."
          actions={<Button><Plus /> Primary action</Button>}
        />

        <SectionCard title="Colors" description="Existing and new tokens">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SWATCH_GROUPS.map((g) => (
              <div key={g.name} className="flex flex-col gap-3">
                <div className="text-small font-semibold text-ink-2">{g.name}</div>
                {g.items.map(([n, c]) => (
                  <Swatch key={n} name={n} cls={c} />
                ))}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Typography">
          <div className="flex flex-col gap-3">
            {TYPE_SAMPLES.map(([label, cls]) => (
              <div key={cls} className="flex flex-wrap items-baseline gap-4">
                <span className="w-44 shrink-0 text-caption text-ink-4">{label}</span>
                <span className={`${cls} text-ink-1`}>The quick brown fox 1,234.50</span>
              </div>
            ))}
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="w-44 shrink-0 text-caption text-ink-4">font-data</span>
              <span className="font-data text-body text-ink-1">INV-2026-0042</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Buttons" description="Every variant by size, then disabled">
          <div className="flex flex-col gap-5">
            {["default", "outline", "secondary", "ghost", "destructive", "link", "approve", "reject"].map((v) => (
              <Row key={v} label={v}>
                <Button variant={v}>Label</Button>
                <Button variant={v} size="sm">Small</Button>
                <Button variant={v} size="lg">Large</Button>
                <Button variant={v} size="icon" aria-label="Add"><Plus /></Button>
                <Button variant={v} disabled>Disabled</Button>
              </Row>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Form controls">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Name" htmlFor="sg-name" hint="As on the ID card">
              <Input id="sg-name" placeholder="Full name" />
            </FormField>
            <FormField label="Email" htmlFor="sg-email" error="Enter a valid email" required>
              <Input id="sg-email" defaultValue="not-an-email" />
            </FormField>
            <FormField label="Disabled" htmlFor="sg-dis">
              <Input id="sg-dis" disabled defaultValue="Read only" />
            </FormField>
            <FormField label="Project" htmlFor="sg-sel">
              <Select defaultValue="b">
                <SelectTrigger id="sg-sel">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Tower A</SelectItem>
                  <SelectItem value="b">Tower B</SelectItem>
                  <SelectItem value="c">Podium</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Notes" htmlFor="sg-ta" className="md:col-span-2">
              <Textarea id="sg-ta" placeholder="Write something" />
            </FormField>
            <div className="flex items-center gap-2">
              <Checkbox id="sg-cb" checked={checked} onCheckedChange={setChecked} />
              <Label htmlFor="sg-cb">Remember this choice</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="sg-cb2" />
              <Label htmlFor="sg-cb2">Unchecked</Label>
            </div>
            <div className="md:col-span-2">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                placeholder="Search employees..."
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Select open state" description="Hover an item vs the selected one (Tower B)">
          <div className="min-h-[190px]">
            <Select defaultOpen defaultValue="b">
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Tower A</SelectItem>
                <SelectItem value="b">Tower B (selected)</SelectItem>
                <SelectItem value="c">Podium</SelectItem>
                <SelectItem value="d">Basement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SectionCard>

        <SectionCard title="Badges">
          <div className="flex flex-col gap-5">
            <Row label="Variants">
              {["default", "secondary", "destructive", "outline"].map((v) => (
                <Badge key={v} variant={v}>{v}</Badge>
              ))}
            </Row>
            <Row label="Tones">
              {TONES.map((t) => (
                <Badge key={t} variant={t}>{t}</Badge>
              ))}
            </Row>
            <Row label="Tones with dot">
              {TONES.map((t) => (
                <Badge key={t} variant={t} dot>{t}</Badge>
              ))}
            </Row>
            <Row label="StatusBadge">
              {STATUSES.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </Row>
          </div>
        </SectionCard>

        <SectionCard title="Cards and StatCards">
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Employees" value="248" sub="12 joined this month" icon={Users} tone="info" />
              <StatCard label="Payroll" value={formatCurrency(1845200)} sub="Due on the 10th" icon={Wallet} tone="highlight" />
              <StatCard label="On time" value="93%" sub="Up 2% vs last week" icon={CheckCircle2} tone="ok" />
              <StatCard label="Pending" value="7" sub="Needs review" icon={Clock} tone="warn" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Plain Card</CardTitle>
                <CardDescription>CardHeader stacks title and description</CardDescription>
              </CardHeader>
              <CardContent>Card body content (p-5).</CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              {["neutral", "ok", "warn", "bad", "info", "highlight", "purple", "pink", "brand"].map((t) => (
                <IconTile key={t} icon={Info} tone={t} />
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Tabs" flush>
          <Tabs defaultValue="one" className="px-5 pt-1">
            <TabsList>
              <TabsTrigger value="one">Overview</TabsTrigger>
              <TabsTrigger value="two">Activity</TabsTrigger>
              <TabsTrigger value="three">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="one" className="py-4 text-body text-ink-2">Overview content</TabsContent>
            <TabsContent value="two" className="py-4 text-body text-ink-2">Activity content</TabsContent>
            <TabsContent value="three" className="py-4 text-body text-ink-2">Settings content</TabsContent>
          </Tabs>
        </SectionCard>

        <SectionCard title="SegmentedControl">
          <div className="flex flex-wrap items-center gap-5">
            <SegmentedControl
              aria-label="Range"
              value={seg}
              onChange={setSeg}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week", count: 12 },
                { value: "month", label: "Month", icon: Clock },
              ]}
            />
            <SegmentedControl
              aria-label="Filter"
              size="sm"
              value={segSm}
              onChange={setSegSm}
              options={[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="DataTable and PaginationBar" flush>
          <FilterBar>
            <FilterField label="Search" htmlFor="sg-f1" flex="2 1 240px">
              <SearchInput id="sg-f1" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} />
            </FilterField>
            <FilterField label="Status" htmlFor="sg-f2">
              <Select defaultValue="all">
                <SelectTrigger id="sg-f2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>
          <DataTable
            columns={TABLE_COLUMNS}
            rows={pageRows}
            onRowClick={() => {}}
            footer={
              <PaginationBar
                currentPage={page}
                totalPages={totalPages}
                totalItems={SAMPLE_ROWS.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            }
          />
        </SectionCard>

        <div className="grid gap-5 md:grid-cols-2">
          <SectionCard title="DataTable: loading" flush>
            <DataTable columns={TABLE_COLUMNS.slice(0, 3)} rows={[]} loading />
          </SectionCard>
          <SectionCard title="DataTable: empty" flush>
            <DataTable columns={TABLE_COLUMNS.slice(0, 3)} rows={[]} />
          </SectionCard>
        </div>

        <SectionCard title="Dialogs">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit project</DialogTitle>
                  <DialogDescription>Change the details below and save.</DialogDescription>
                </DialogHeader>
                <FormField label="Name" htmlFor="sg-dlg">
                  <Input id="sg-dlg" defaultValue="Tower B" />
                </FormField>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 /> Delete record
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Delete this record?"
              description="This cannot be undone."
              confirmLabel="Delete"
              tone="destructive"
              loading={confirmLoading}
              onConfirm={confirm}
            />
          </div>
        </SectionCard>

        <SectionCard title="Alerts">
          <div className="flex flex-col gap-3">
            {["default", "destructive", "ok", "warn", "bad", "info"].map((v) => (
              <Alert key={v} variant={v}>
                <Info className="h-4 w-4" />
                <AlertTitle>{v}</AlertTitle>
                <AlertDescription>Alert description for the {v} variant.</AlertDescription>
              </Alert>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Progress and ProgressRow">
          <div className="flex flex-col gap-4">
            <Progress value={60} />
            <ProgressRow label="Tower A" value={62} trailing="62%" />
            <ProgressRow label="Tower B" value={28} trailing="28%" />
            <ProgressRow label="Podium" value={9} max={12} trailing="9/12" />
          </div>
        </SectionCard>

        <SectionCard title="Avatars and skeletons">
          <div className="flex flex-col gap-4">
            <Row label="UserAvatar sizes">
              <UserAvatar name="Anil Kumar" size="sm" />
              <UserAvatar name="Meera Shah" />
              <UserAvatar name="Rahul Verma" size="lg" />
              <UserAvatar name="" />
            </Row>
            <Row label="UserAvatar tones">
              {["brand", "neutral", "ok", "warn", "bad", "info", "highlight", "purple", "pink"].map((t) => (
                <UserAvatar key={t} name="Sneha Patil" tone={t} />
              ))}
            </Row>
            <Separator />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Desktop shell" description="Sidebar, top bar and content area">
          <Link to="/styleguide/shell" className="text-body font-medium text-primary underline-offset-4 hover:underline">
            Open the shell preview
          </Link>
        </SectionCard>

        <SectionCard title="EmptyState" flush>
          <EmptyState
            icon={Inbox}
            title="No indents yet"
            description="When someone raises an indent it will show up here."
            action={<Button><Search /> Browse materials</Button>}
          />
        </SectionCard>
      </div>
    </div>
  );
}
