// src/pages/reimbursements/MyReimbursements.jsx  (mobile: the Reimbursement tile)
// The list of the employee's own claims with a "New claim" action. GET /reimbursements/my is unchanged.
import React, { useEffect, useState } from "react";
import { getToken } from '@/lib/session';
import axios from "@/api/client";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';
import { Plus, Receipt } from "lucide-react";
import { Button } from '@/components/ui/button';
import { EmptyState } from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/PageLoader";
import { StatusBadge } from "@/components/common/StatusBadge";
import MobileCard from "@/layouts/mobile/MobileCard";
import MobilePage from "@/layouts/mobile/MobilePage";
import { formatCurrency, formatDate } from "@/lib/format";

const MyReimbursements = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = getToken();

  useEffect(() => {
    fetchReimbursements();
  }, []);

  const fetchReimbursements = async () => {
    try {
      const res = await axios.get("/reimbursements/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReimbursements(res.data || []);
    } catch (err) {
      console.error("Failed to fetch reimbursements", err);
      toast.error("Couldn\u2019t load your claims", { description: "Check your connection and try again.", action: { label: "Retry", onClick: () => fetchReimbursements() } });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader label="Loading your claims" />;

  return (
    <MobilePage title="Reimbursements" back onBack={() => navigate(-1)} tabs="worker">
      <Button size="xl" className="w-full" onClick={() => navigate("/reimbursements/new")}>
        <Plus /> New claim
      </Button>

      {reimbursements.length === 0 ? (
        <MobileCard>
          <EmptyState icon={Receipt} title="No claims yet" description="Submit your first expense claim." />
        </MobileCard>
      ) : (
        reimbursements.map((reimb) => (
          <MobileCard key={reimb._id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[20px] font-semibold tabular-nums text-ink-1">{formatCurrency(reimb.totalAmount)}</div>
                <div className="text-small text-ink-3">{formatDate(reimb.submittedAt)}</div>
              </div>
              <StatusBadge status={reimb.status} />
            </div>
            <div className="rounded-control bg-surface-subtle p-3 text-small text-ink-3">
              <span className="font-semibold text-ink-2">{reimb.items.length}</span> expense {reimb.items.length === 1 ? "item" : "items"}
              {reimb.note ? <p className="mt-1 line-clamp-1 text-caption-lg">{reimb.note}</p> : null}
            </div>
          </MobileCard>
        ))
      )}
    </MobilePage>
  );
};

export default MyReimbursements;
