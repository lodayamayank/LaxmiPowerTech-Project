// src/layouts/desktop/NotificationsPopover.jsx
// Bell button + popover with the retention-payment reminders (work orders).
// The list is fetched when the popover opens (same as before); nothing runs while closed.
import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import axios from '@/api/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

const TONES = {
  danger: 'bg-tone-bad-soft text-tone-bad-fg',
  warning: 'bg-tone-warn-soft text-tone-warn-fg',
};

// Local formatters kept as they were (output differs slightly from lib/format.js).
const formatCurrency = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toNotification = (order) => {
  if (!order?.isTriggered || !order.retentionAmount || !order.retentionDueDate) return null;
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const dueDate = new Date(order.retentionDueDate);
  dueDate.setHours(0, 0, 0, 0);
  const reminderDate = new Date(order.retentionReminderDate || order.retentionDueDate);
  reminderDate.setHours(0, 0, 0, 0);
  if (todayDate < reminderDate) return null;
  const overdue = todayDate > dueDate;
  return {
    id: order._id,
    title: overdue ? 'Retention overdue' : 'Retention due soon',
    message: `${order.project?.name || 'Project'} / ${order.workOrderNo}: pay ${formatCurrency(
      order.retentionAmount,
    )} by ${formatDate(order.retentionDueDate)}.`,
    severity: overdue ? 'danger' : 'warning',
  };
};

export default function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/work-orders/retention-notifications');
      const orders = res.data?.data || [];
      setNotifications(orders.map(toNotification).filter(Boolean));
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-ink-3" title="Notifications" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.8} />
          {notifications.length > 0 && (
            <span className="absolute right-2 top-2 box-content h-2 w-2 rounded-full border-2 border-surface bg-highlight" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-small font-semibold text-ink-1">Notifications</p>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-ink-3" onClick={() => setOpen(false)} title="Close notifications">
            <X size={14} />
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto p-3">
          {loading && notifications.length === 0 ? (
            <div className="py-8 text-center text-small text-ink-3">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <EmptyState icon={BellOff} title="No notifications" description="You are all caught up." className="py-6" />
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={cn('rounded-control px-3 py-2', TONES[n.severity] ?? 'bg-surface-muted text-ink-3')}>
                  <p className="text-small font-semibold">{n.title}</p>
                  <p className="mt-1 text-caption leading-5">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
