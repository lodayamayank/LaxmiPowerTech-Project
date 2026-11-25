// src/pages/reimbursements/AdminReimbursements.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileX } from "lucide-react";
import { toast } from "sonner";
import axios from "@/api/client";
import { getToken } from "@/lib/session";
import { EVENTS } from "@/lib/events";
import DashboardLayout from "@/layouts/desktop/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { FormField } from "@/components/common/FormField";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { SectionCard } from "@/components/common/SectionCard";
import ReimbursementDetailsDialog from "./components/ReimbursementDetailsDialog";
import { getReimbursementColumns, getReimbursementMobileCard } from "./components/reimbursementColumns";

const ALL = "__all__"; // Radix SelectItem cannot use ""; mapped back to "" before touching filters
const INITIAL_FILTERS = { status: "", role: "", from: "", to: "" };

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const ROLE_OPTIONS = [
  ["labour", "Labour"],
  ["staff", "Staff"],
  ["supervisor", "Supervisor"],
  ["subcontractor", "Subcontractor"],
];

const CONFIRM_COPY = {
  approved: { title: "Approve this reimbursement?", description: "The claim will be marked as approved.", confirmLabel: "Approve" },
  paid: { title: "Mark this reimbursement as paid?", description: "The claim will be marked as paid.", confirmLabel: "Mark paid" },
};

const AdminReimbursements = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReimbursement, setSelectedReimbursement] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters (applied with the Filter button, or at once by a status tab / Clear filters)
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Pagination (server side, 1-based)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // Decision dialogs: { id, status } for approve / mark paid; rejectId + reason for reject
  const [confirm, setConfirm] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState("");

  const token = useMemo(() => getToken(), []);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const fetchList = useCallback(
    async (f, p, l) => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await axios.get("/reimbursements", {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: p, limit: l, ...f },
        });
        setReimbursements(res.data.rows || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error("Failed to fetch reimbursements", err);
        if (err.response?.status === 403) {
          toast.error("Access denied. Admin privileges required.");
        } else {
          toast.error("Couldn't load reimbursements", {
            description: "Check your connection and try again.",
            action: { label: "Retry", onClick: () => fetchList(f, p, l) },
          });
        }
        setReimbursements([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  // Initial load, and whenever the page or page size changes (filters only apply on submit).
  useEffect(() => {
    if (!token) {
      console.error("No token available");
      return;
    }
    fetchList(filters, page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, token]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchList(filters, page, limit);
  };

  // Tabs and Clear filters apply right away: one request, whichever page we were on.
  const applyFilters = (next) => {
    setFilters(next);
    if (page !== 1) setPage(1); // the page effect refetches with `next`
    else fetchList(next, 1, limit);
  };

  const hasActiveFilters = Boolean(filters.role || filters.from || filters.to);
  const clearFilters = () => applyFilters({ ...INITIAL_FILTERS, status: filters.status });

  const handleStatusUpdate = async (id, status, rejectionReason = "") => {
    try {
      await axios.patch(
        `/reimbursements/${id}/status`,
        { status, rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      window.dispatchEvent(new Event(EVENTS.pendingCountsRefresh)); // sidebar badge refresh
      toast.success(status === "approved" ? "Reimbursement approved" : status === "paid" ? "Marked as paid" : "Reimbursement rejected", {
        description: "The claim status has been updated.",
      });
      fetchList(filters, page, limit);
      setShowDetailsModal(false);
      setSelectedReimbursement(null);
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Couldn’t update the claim", {
        description: error.response?.data?.message || "Check your connection and try again.",
        action: { label: "Retry", onClick: () => handleStatusUpdate(id, status, rejectionReason) },
      });
    }
  };

  const handleApprove = useCallback((id) => setConfirm({ id, status: "approved" }), []);
  const handleMarkPaid = useCallback((id) => setConfirm({ id, status: "paid" }), []);
  const handleReject = useCallback((id) => {
    setReason("");
    setRejectId(id);
  }, []);

  const confirmDecision = async () => {
    const { id, status } = confirm;
    setConfirm(null);
    await handleStatusUpdate(id, status);
  };

  const confirmReject = async () => {
    if (!reason) return;
    const id = rejectId;
    setRejectId(null);
    await handleStatusUpdate(id, "rejected", reason);
  };

  const viewDetails = useCallback(
    async (id) => {
      try {
        const res = await axios.get(`/reimbursements/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedReimbursement(res.data);
        setShowDetailsModal(true);
      } catch (error) {
        console.error("Failed to load details", error);
        toast.error("Failed to load details");
      }
    },
    [token],
  );

  const handlers = useMemo(
    () => ({ onView: viewDetails, onApprove: handleApprove, onReject: handleReject, onMarkPaid: handleMarkPaid }),
    [viewDetails, handleApprove, handleReject, handleMarkPaid],
  );
  const columns = useMemo(() => getReimbursementColumns(handlers), [handlers]);
  const mobileCard = useMemo(() => getReimbursementMobileCard(handlers), [handlers]);

  const activeTab = TABS.find((t) => t.value === (filters.status || "all")) || TABS[4];
  const emptyState = (
    <EmptyState
      icon={FileX}
      title="No reimbursements"
      description={
        hasActiveFilters
          ? "No reimbursement claims match these filters."
          : filters.status
            ? `There are no ${activeTab.label.toLowerCase()} reimbursement claims.`
            : "There are no reimbursement claims yet."
      }
    />
  );

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="People / Reimbursements"
        title="Reimbursements"
        description="Expense claims from site teams, from approval to payout."
      />

      <SectionCard flush>
        <Tabs
          value={filters.status || "all"}
          onValueChange={(v) => applyFilters({ ...filters, status: v === "all" ? "" : v })}
          className="overflow-x-auto px-5"
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <form onSubmit={onSearch}>
          <FilterBar onClear={clearFilters} showClear={hasActiveFilters}>
            <FilterField label="Role" htmlFor="reimb-role" grow={14} minWidth={140} maxWidth={240}>
              <Select
                value={filters.role || ALL}
                onValueChange={(value) => setFilters({ ...filters, role: value === ALL ? "" : value })}
              >
                <SelectTrigger id="reimb-role" aria-label="Filter by role">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Roles</SelectItem>
                  {ROLE_OPTIONS.map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Submitted from" htmlFor="reimb-from" grow={15} minWidth={150} maxWidth={180}>
              <Input id="reimb-from" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </FilterField>
            <FilterField label="Submitted to" htmlFor="reimb-to" grow={15} minWidth={150} maxWidth={180}>
              <Input id="reimb-to" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </FilterField>
            <Button type="submit">Filter</Button>
          </FilterBar>
        </form>

        <DataTable
          columns={columns}
          rows={reimbursements}
          rowKey="_id"
          loading={loading}
          emptyState={emptyState}
          mobileCard={mobileCard}
          footer={
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          }
        />
      </SectionCard>

      {showDetailsModal && selectedReimbursement ? (
        <ReimbursementDetailsDialog
          reimbursement={selectedReimbursement}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedReimbursement(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkPaid={handleMarkPaid}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        {...(CONFIRM_COPY[confirm?.status] || CONFIRM_COPY.approved)}
        onConfirm={confirmDecision}
      />

      <Dialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this reimbursement?</DialogTitle>
            <DialogDescription>Enter a rejection reason. The submitter will see it.</DialogDescription>
          </DialogHeader>
          <FormField label="Rejection reason" htmlFor="reimb-reject-reason" required>
            <Textarea id="reimb-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this claim rejected?" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!reason} onClick={confirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminReimbursements;
