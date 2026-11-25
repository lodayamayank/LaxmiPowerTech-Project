// src/pages/dashboard/components/useDashboardAttention.js
// Read-only extras for the admin dashboard's "Needs your attention" list and the open-deliveries card:
// pending reimbursements, overdue / due-soon work-order retention and open upcoming deliveries.
// Each request is independent and failures are ignored (that row is simply not shown), so the dashboard never breaks.
import { useEffect, useState } from "react";
import axios from "@/api/client";
import { upcomingDeliveryAPI } from "@/api/material";
import { formatCurrency, formatDate } from "@/lib/format";

const retentionItem = (order) => {
  if (!order?.isTriggered || !order.retentionAmount || !order.retentionDueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(order.retentionDueDate);
  due.setHours(0, 0, 0, 0);
  const reminder = new Date(order.retentionReminderDate || order.retentionDueDate);
  reminder.setHours(0, 0, 0, 0);
  if (today < reminder) return null;
  const overdue = today > due;
  return {
    id: order._id,
    overdue,
    title: `${overdue ? "Retention overdue" : "Retention due soon"} · ${order.workOrderNo}${order.project?.name ? ` (${order.project.name})` : ""}`,
    sub: `${formatCurrency(order.retentionAmount)} ${overdue ? "was due" : "due"} ${formatDate(order.retentionDueDate)}`,
  };
};

export default function useDashboardAttention() {
  const [state, setState] = useState({ reimbursements: 0, retention: [], deliveries: { open: 0, partial: 0, pending: 0 } });

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([
      axios.get("/reimbursements/pending-count"),
      axios.get("/work-orders/retention-notifications"),
      upcomingDeliveryAPI.getAll(1, 500),
    ]).then(([reimb, ret, del]) => {
      if (ignore) return;
      const deliveries = del.status === "fulfilled" ? del.value?.data || [] : [];
      const partial = deliveries.filter((d) => d.status?.toLowerCase() === "partial").length;
      const pending = deliveries.filter((d) => d.status?.toLowerCase() === "pending").length;
      setState({
        reimbursements: reimb.status === "fulfilled" ? Number(reimb.value.data?.count) || 0 : 0,
        retention: ret.status === "fulfilled" ? (ret.value.data?.data || []).map(retentionItem).filter(Boolean) : [],
        deliveries: { open: partial + pending, partial, pending },
      });
    });
    return () => {
      ignore = true;
    };
  }, []);

  return state;
}
