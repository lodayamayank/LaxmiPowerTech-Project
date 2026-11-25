// src/pages/attendance/TeamAttendance.jsx  (route: /branch/:branchId/team-attendance, mobile)
// Laid out like the Team attendance design: date + "Mark all in", counts, one row per labour with In / Out / Absent
// chips and a sticky "Save attendance" bar. Changes are staged and saved together with the same POST /attendance/bulk
// records the per-person buttons sent before (same record shape and the same checks). The Summary tab keeps the
// per-day overview.
import React, { useState, useEffect } from 'react';
import { ROUTES } from '@/lib/routes';
import { getSelectedBranchName } from '@/lib/branchContext';
import { getToken } from '@/lib/session';
import { fetchUsersCached } from '@/hooks/useUsers';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '@/api/client';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChoiceChips } from '@/components/common/ChoiceChips';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/PageLoader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { UserAvatar } from '@/components/common/UserAvatar';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';

// Build an ISO datetime string for a given date (YYYY-MM-DD) and time (HH:MM)
// Uses explicit year/month/day construction to avoid UTC-midnight parsing issues
const buildDateTime = (date, time) => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0).toISOString();
};

const TeamAttendance = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const token = getToken();
  const projectName = getSelectedBranchName() || 'Project';

  // ── Tab: 'summary' | 'mark' ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('mark');

  // ── Summary tab state ────────────────────────────────────────────────────
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    totalLabours: 0, totalPresent: 0, totalAbsent: 0, totalLeaves: 0, totalOvertimeHours: 0,
  });

  // ── Mark tab state ───────────────────────────────────────────────────────
  const [markDate, setMarkDate] = useState(new Date().toISOString().split('T')[0]);
  // each member: { ...user, inTime, outTime, isAbsent, savedIn, savedOut }
  const [markMembers, setMarkMembers] = useState([]);
  const [markLoading, setMarkLoading] = useState(false);

  // ────────────────────────────────────────────────────────────────────────
  // SUMMARY: fetch labours + attendance for date range
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (branchId && activeTab === 'summary') fetchTeamAttendance();
  }, [viewDate, branchId, activeTab]);

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);

      const [usersRes, attendanceRes] = await Promise.all([
        fetchUsersCached({ role: 'labour' }).then((data) => ({ data })),
        axios.get('/attendance/by-date', { params: { branch: branchId, date: viewDate }, headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const branchLabours = (usersRes.data || []).filter(user =>
        Array.isArray(user.assignedBranches) &&
        user.assignedBranches.some(b => (typeof b === 'object' ? b._id : b) === branchId)
      );

      if (branchLabours.length === 0) {
        setLabours([]);
        setLoading(false);
        return;
      }

      const allAttendance = attendanceRes.data || [];

      let totalPresent = 0, totalPunchedIn = 0, totalAbsent = 0, totalHalf = 0, totalOvertimeHours = 0;

      const laboursWithStats = branchLabours.map(labour => {
        const recs = allAttendance.filter(a => (a.user?._id || a.user) === labour._id);

        const inRec  = recs.find(a => a.punchType === 'in');
        const outRec = recs.find(a => a.punchType === 'out');
        const isAbsent = recs.some(a => a.punchType === 'absent');

        // Calculate duration from actual punch times
        let durationMinutes = 0;
        let overtimeHours = 0;
        if (inRec && outRec) {
          const inTime  = new Date(inRec.punchTime  || inRec.createdAt);
          const outTime = new Date(outRec.punchTime || outRec.createdAt);
          durationMinutes = (outTime - inTime) / (1000 * 60);
          const durationHours = durationMinutes / 60;
          overtimeHours = Math.max(0, durationHours - 9);
        }

        // Classify based on duration — mirrors salary service exactly
        const hasIn  = !!inRec;
        const hasOut = !!outRec;
        const isFullDay       = hasIn && hasOut && durationMinutes >= 480;
        const isHalfDay       = recs.some(a => ['half', 'half-day'].includes(a.punchType)) ||
                                (hasIn && hasOut && durationMinutes >= 240 && durationMinutes < 480);
        const isTooShort      = hasIn && hasOut && durationMinutes < 240; // < 4 hrs → absent
        const isPunchedInOnly = hasIn && !hasOut;

        if (isFullDay)            totalPresent++;
        else if (isPunchedInOnly) totalPunchedIn++;
        if (isAbsent || isTooShort) totalAbsent++;
        if (isHalfDay)            totalHalf++;
        totalOvertimeHours += overtimeHours;

        let status = null;
        if (isAbsent || isTooShort) status = 'absent';
        else if (isFullDay)         status = 'present';
        else if (isHalfDay)         status = 'half-day';
        else if (isPunchedInOnly)   status = 'in';

        return { ...labour, isPresent: isFullDay, isPunchedInOnly, isAbsent, isHalf: isHalfDay, overtimeHours, status };
      });

      setLabours(laboursWithStats);
      setSummary({ totalLabours: branchLabours.length, totalPresent, totalPunchedIn, totalAbsent, totalHalf, totalOvertimeHours });
    } catch (err) {
      toast.error('Couldn\u2019t load the summary', { description: err.response?.data?.message || 'Check your connection and try again.', action: { label: 'Retry', onClick: () => fetchTeamAttendance() } });
      setLabours([]);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // MARK: fetch labours + today's existing attendance
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (branchId && activeTab === 'mark') fetchMarkData();
  }, [branchId, markDate, activeTab]);

  const fetchMarkData = async () => {
    setMarkLoading(true);
    try {
      const [usersRes, attendanceRes] = await Promise.all([
        fetchUsersCached({ role: 'labour' }).then((data) => ({ data })),
        axios.get('/attendance/by-date', { params: { branch: branchId, date: markDate }, headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const branchMembers = (usersRes.data || []).filter(u =>
        Array.isArray(u.assignedBranches) &&
        u.assignedBranches.some(b => (typeof b === 'object' ? b._id : b) === branchId)
      );

      // Group existing records by user
      const byUser = {};
      (attendanceRes.data || []).forEach(a => {
        const uid = a.user?._id || a.user;
        if (!byUser[uid]) byUser[uid] = [];
        byUser[uid].push(a);
      });

      const toTime = (isoStr) => {
        if (!isoStr) return null;
        const d = new Date(isoStr);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };

      setMarkMembers(branchMembers.map(u => {
        const recs = byUser[u._id] || [];
        const inRec  = recs.find(r => r.punchType === 'in');
        const outRec = recs.find(r => r.punchType === 'out');
        const absRec = recs.find(r => r.punchType === 'absent');
        return {
          ...u,
          inTime:   toTime(inRec?.punchTime || inRec?.createdAt) || '09:00',
          outTime:  toTime(outRec?.punchTime || outRec?.createdAt) || '18:00',
          isAbsent: !!absRec,
          savedIn:  !!inRec,
          savedOut: !!outRec,
        };
      }));
    } catch {
      toast.error('Couldn\u2019t load the team', { description: 'Check your connection and try again.', action: { label: 'Retry', onClick: () => fetchMarkData() } });
    } finally {
      setMarkLoading(false);
    }
  };

  const updateMember = (userId, patch) =>
    setMarkMembers(prev => prev.map(m => m._id === userId ? { ...m, ...patch } : m));

  // ── Staged marks (design: In / Out / Absent chips, then one Save) ───────────────
  const [staged, setStaged] = useState({}); // { userId: 'in' | 'out' | 'absent' }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStaged({});
  }, [markDate, branchId]);

  const stageMark = (member, mark) => setStaged((prev) => ({ ...prev, [member._id]: prev[member._id] === mark ? undefined : mark }));
  const markAllIn = () => setStaged(Object.fromEntries(markMembers.filter((m) => !m.savedIn && !m.isAbsent).map((m) => [m._id, 'in'])));
  const changes = Object.entries(staged).filter(([, v]) => v);

  const saveAttendance = async () => {
    // Same checks as before, per person.
    for (const [userId, mark] of changes) {
      const member = markMembers.find((m) => m._id === userId);
      if (!member) continue;
      if (mark === 'out' && !member.savedIn && staged[userId] !== 'in') {
        toast.error(`${member.name} has no punch in`, { description: 'Mark them In first, then Out.' });
        return;
      }
      if (mark === 'out') {
        const inDt = buildDateTime(markDate, member.inTime);
        const outDt = buildDateTime(markDate, member.outTime);
        if (new Date(outDt) <= new Date(inDt)) {
          toast.error('Check the times', { description: `${member.name}\u2019s punch out must be after punch in (${member.inTime}).` });
          return;
        }
      }
    }
    const records = changes.map(([userId, mark]) => {
      const member = markMembers.find((m) => m._id === userId);
      return mark === 'absent'
        ? { user: userId, branch: branchId, status: 'absent', date: markDate }
        : { user: userId, branch: branchId, status: mark, date: markDate, punchTime: buildDateTime(markDate, mark === 'in' ? member.inTime : member.outTime) };
    });
    setSaving(true);
    try {
      await axios.post('/attendance/bulk', { records }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Attendance saved', { description: `${records.length} ${records.length === 1 ? 'person' : 'people'} at ${projectName}` });
      setMarkMembers((prev) =>
        prev.map((m) => {
          const mark = staged[m._id];
          if (mark === 'in') return { ...m, savedIn: true, isAbsent: false };
          if (mark === 'out') return { ...m, savedOut: true, isAbsent: false };
          if (mark === 'absent') return { ...m, isAbsent: true, savedIn: false, savedOut: false };
          return m;
        }),
      );
      setStaged({});
    } catch (err) {
      toast.error('Couldn\u2019t save attendance', { description: err.response?.data?.message || 'Check your connection and try again.', action: { label: 'Retry', onClick: () => saveAttendance() } });
    } finally {
      setSaving(false);
    }
  };

  const markStats = {
    total: markMembers.length,
    present: markMembers.filter((m) => m.savedIn && m.savedOut).length,
    absent: markMembers.filter((m) => m.isAbsent).length,
    punchedIn: markMembers.filter((m) => m.savedIn).length,
  };
  const today = new Date().toISOString().split('T')[0];
  const dateLabel = (d) => (d === today ? 'Today, ' : '') + new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const labelMap = { in: 'Punched in', out: 'Punched out', present: 'Present', absent: 'Absent', 'half-day': 'Half day', half: 'Half day', paidleave: 'Paid leave', unpaidleave: 'Unpaid leave' };
  const toneOf = { in: 'ok', out: 'info', present: 'ok', absent: 'bad', 'half-day': 'warn', half: 'warn' };
  const Count = ({ value, label, tone = 'text-ink-1' }) => (
    <div className="flex-1 text-center">
      <div className={`text-[20px] font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="text-caption text-ink-3">{label}</div>
    </div>
  );

  return (
    <MobilePage
      title="Team attendance"
      back
      onBack={() => navigate(ROUTES.branch.labourDashboard(branchId))}
      footer={
        activeTab === 'mark' && changes.length > 0 ? (
          <Button size="xl" className="w-full" onClick={saveAttendance} disabled={saving}>
            {saving ? 'Saving…' : `Save attendance \u00b7 ${changes.length} ${changes.length === 1 ? 'change' : 'changes'}`}
          </Button>
        ) : null
      }
    >
      <SegmentedControl
        aria-label="View"
        className="w-full [&>*]:flex-1"
        options={[
          { value: 'mark', label: 'Mark' },
          { value: 'summary', label: 'Summary' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'mark' && (
        <>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Attendance date" value={markDate} max={today} onChange={(e) => setMarkDate(e.target.value)} className="flex-1" />
            <Button variant="outline" onClick={markAllIn} disabled={markLoading || markMembers.length === 0}>
              Mark all in
            </Button>
          </div>
          <p className="-mt-2 text-small text-ink-3">{projectName} · {dateLabel(markDate)}</p>

          {markLoading ? (
            <PageLoader label="Loading team" className="min-h-[40vh]" />
          ) : markMembers.length === 0 ? (
            <MobileCard>
              <EmptyState icon={Users} title="No team members" description="No labours are assigned to this site." />
            </MobileCard>
          ) : (
            <>
              <MobileCard className="flex gap-2.5">
                <Count value={markStats.total} label="Total" />
                <Count value={markStats.punchedIn} label="In" tone="text-tone-ok-fg" />
                <Count value={markStats.absent} label="Absent" tone="text-tone-bad-fg" />
                <Count value={markStats.present} label="Done" tone="text-tone-info-fg" />
              </MobileCard>

              <MobileCard className="!py-1">
                {markMembers.map((member) => {
                  const mark = staged[member._id];
                  const state = member.isAbsent ? 'absent' : member.savedIn && member.savedOut ? 'present' : member.savedIn ? 'in' : null;
                  const value = mark || (member.isAbsent ? 'absent' : member.savedOut ? 'out' : member.savedIn ? 'in' : '');
                  return (
                    <div key={member._id} className="flex flex-col gap-2.5 border-b border-line py-3 last:border-b-0">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={member.name} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14.5px] font-semibold text-ink-1">{member.name}</div>
                          <div className="text-small text-ink-3">{member.jobTitle || 'Labour'} · {member.employeeId || member.username}</div>
                        </div>
                        <Badge variant={state ? toneOf[state] : 'neutral'}>{mark ? 'Unsaved' : state ? labelMap[state] : 'Not marked'}</Badge>
                      </div>
                      <ChoiceChips
                        aria-label={`Mark ${member.name}`}
                        className="flex-nowrap [&>*]:flex-1 [&>*]:justify-center"
                        options={[
                          { value: 'in', label: 'In' },
                          { value: 'out', label: 'Out' },
                          { value: 'absent', label: 'Absent' },
                        ]}
                        value={value}
                        onChange={(v) => stageMark(member, v)}
                      />
                      {(value === 'in' || value === 'out') && (
                        <div className="flex items-center gap-2">
                          <span className="w-20 text-small text-ink-3">{value === 'in' ? 'Punch in' : 'Punch out'}</span>
                          <Input
                            type="time"
                            aria-label={value === 'in' ? 'Punch in time' : 'Punch out time'}
                            value={value === 'in' ? member.inTime : member.outTime}
                            onChange={(e) => updateMember(member._id, value === 'in' ? { inTime: e.target.value } : { outTime: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </MobileCard>
            </>
          )}
        </>
      )}

      {activeTab === 'summary' && (
        <>
          <Input type="date" aria-label="View date" value={viewDate} max={today} onChange={(e) => setViewDate(e.target.value)} />

          {loading ? (
            <PageLoader label="Loading attendance" className="min-h-[40vh]" />
          ) : labours.length === 0 ? (
            <MobileCard>
              <EmptyState icon={Users} title="No attendance data found" description="No labours or attendance records for this date." />
            </MobileCard>
          ) : (
            <>
              <MobileCard title="Overview" className="flex flex-wrap gap-y-3">
                <Count value={summary.totalLabours} label="Total" />
                <Count value={summary.totalPresent} label="Present" tone="text-tone-ok-fg" />
                <Count value={summary.totalPunchedIn || 0} label="Punched in" tone="text-tone-warn-fg" />
                <Count value={summary.totalAbsent} label="Absent" tone="text-tone-bad-fg" />
                <Count value={summary.totalHalf || 0} label="Half day" tone="text-tone-warn-fg" />
                <Count value={(summary.totalOvertimeHours || 0).toFixed(1)} label="OT hrs" />
              </MobileCard>

              <MobileCard className="!py-1">
                {labours.map((labour) => (
                  <div key={labour._id} className="border-b border-line py-3 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={labour.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-semibold text-ink-1">{labour.name}</div>
                        <div className="text-small text-ink-3">{labour.jobTitle || 'Labour'} · {labour.employeeId || labour.username}</div>
                      </div>
                      <Badge variant={labour.status ? toneOf[labour.status] || 'neutral' : 'neutral'}>{labour.status ? labelMap[labour.status] || labour.status : 'Not marked'}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-3">
                      {labour.standardDailyHours ? <span>Std hours: <b className="font-medium text-ink-2">{labour.standardDailyHours} hrs</b></span> : null}
                      {labour.ctcAmount > 0 ? <span>Daily wage: <b className="font-medium text-ink-2">{'\u20b9'}{labour.ctcAmount}</b></span> : null}
                      <span>
                        OT hours:{' '}
                        <b className={labour.overtimeHours > 0 ? 'font-semibold text-tone-purple-fg' : 'font-medium text-ink-4'}>{labour.overtimeHours > 0 ? `${labour.overtimeHours.toFixed(1)} hrs` : '\u2014'}</b>
                      </span>
                    </div>
                  </div>
                ))}
              </MobileCard>
            </>
          )}
        </>
      )}
    </MobilePage>
  );
};

export default TeamAttendance;
