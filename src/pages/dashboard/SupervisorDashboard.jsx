// src/pages/dashboard/SupervisorDashboard.jsx  (mobile home of supervisors and subcontractors)
// Laid out like the Supervisor home / Subcontractor home designs: greeting + role badge, a "not marked" nudge, the punch
// card, today's attendance code, my projects and the personal shortcuts. The subcontractor with no site shows the
// "No projects assigned yet" state. Data: GET /attendance/supervisor-codes (location based, unchanged), the cached
// labour list and GET /attendance/by-date per project for the counts, GET /attendance/my + /attendance/today for the
// punch card.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, FileText, FolderKanban, KeyRound, MapPinned, Receipt, RefreshCw, Users } from 'lucide-react';
import axios from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { IconTile } from '@/components/common/IconTile';
import { UserAvatar } from '@/components/common/UserAvatar';
import { fetchUsersCached } from '@/hooks/useUsers';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';
import MobileTile from '@/layouts/mobile/MobileTile';
import { EVENTS } from '@/lib/events';
import { readPunchStatus } from '@/lib/punchStatusCache';
import { ROLES } from '@/lib/constants';
import { ROUTES } from '@/lib/routes';
import { getToken, getUser, setSelectedBranch, setSelectedBranchName } from '@/lib/session';
import useNetworkStatus from '@/pwa/useNetworkStatus';
import PunchHero from './components/PunchHero';

const greeting = (d) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 17 ? 'Good afternoon' : 'Good evening');
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => a.toDateString() === b.toDateString();

const SupervisorDashboard = () => {
  const user = getUser();
  const navigate = useNavigate();
  const token = getToken();
  const { pendingCount, failedCount } = useNetworkStatus();
  const [now, setNow] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [punch, setPunch] = useState(() => readPunchStatus() || { punchedIn: false, punchedOut: false });
  const [attendanceCodes, setAttendanceCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [projectStats, setProjectStats] = useState({}); // branchId -> { labour, marked }

  const branches = useMemo(() => (user?.assignedBranches || []).filter((b) => b?._id), [user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAttendanceCodes = async () => {
      if (!navigator.geolocation) {
        setError('Location access is required to retrieve the branch attendance code.');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await axios.get('/attendance/supervisor-codes', {
              params: { lat: latitude, lng: longitude },
              headers: { Authorization: `Bearer ${token}` },
            });

            setAttendanceCodes(response.data?.codes || []);
            setError(response.data?.message || '');
          } catch (fetchError) {
            console.error('Failed to load attendance codes:', fetchError);
            setError(fetchError?.response?.data?.message || 'Location access is required to retrieve the branch attendance code.');
            setAttendanceCodes([]);
          } finally {
            setLoading(false);
          }
        },
        (geoError) => {
          console.error('Geolocation error:', geoError);
          setError('Location access is required to retrieve the branch attendance code.');
          setAttendanceCodes([]);
          setLoading(false);
        },
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 20000 }
      );
    };

    fetchAttendanceCodes();
  }, [token]);

  // My own punches (the punch card) and today's status.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/attendance/my', { headers: { Authorization: `Bearer ${token}` } });
        setRecords(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load attendance', err);
      }
      try {
        const res = await axios.get('/attendance/today', { headers: { Authorization: `Bearer ${token}` } });
        const cached = readPunchStatus();
        setPunch({ punchedIn: res.data.punchedIn || cached?.punchedIn || false, punchedOut: res.data.punchedOut || cached?.punchedOut || false });
      } catch {
        /* offline: the cached status is still shown */
      }
    };
    load();
    window.addEventListener(EVENTS.leaveUpdated, load);
    return () => window.removeEventListener(EVENTS.leaveUpdated, load);
  }, [token]);

  // Labour and "not marked" counts per project (the same two requests Team attendance makes).
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!branches.length) return;
      try {
        const labours = await fetchUsersCached({ role: 'labour' });
        const entries = await Promise.all(
          branches.map(async (b) => {
            const ids = new Set(
              (labours || [])
                .filter((u) => Array.isArray(u.assignedBranches) && u.assignedBranches.some((x) => (typeof x === 'object' ? x._id : x) === b._id))
                .map((u) => u._id),
            );
            let marked = 0;
            try {
              const att = await axios.get('/attendance/by-date', { params: { branch: b._id, date: dayKey(new Date()) }, headers: { Authorization: `Bearer ${token}` } });
              marked = new Set((att.data || []).filter((r) => ids.has(r.user?._id || r.user)).map((r) => r.user?._id || r.user)).size;
            } catch {
              /* counts are optional */
            }
            return [b._id, { labour: ids.size, marked }];
          }),
        );
        if (!ignore) setProjectStats(Object.fromEntries(entries));
      } catch (err) {
        console.error('Failed to load project counts', err);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [branches, token]);

  const todayIn = useMemo(
    () =>
      records
        .filter((r) => r.punchType === 'in' && r.createdAt && sameDay(new Date(r.createdAt), now))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0],
    [records, now],
  );
  const elapsedMin = todayIn ? Math.max(0, Math.floor((now - new Date(todayIn.createdAt)) / 60000)) : null;
  const siteNames = branches.map((b) => b.name).filter(Boolean);
  const unmarked = branches
    .map((b) => ({ b, n: Math.max((projectStats[b._id]?.labour || 0) - (projectStats[b._id]?.marked || 0), 0) }))
    .sort((a, c) => c.n - a.n)[0];
  const queued = (pendingCount || 0) + (failedCount || 0);
  const roleLabel = user?.role === ROLES.subcontractor ? 'Subcontractor' : 'Supervisor';

  const openProject = (b) => {
    setSelectedBranch({ id: b._id, name: b.name });
    navigate(ROUTES.branch.labourDashboard(b._id));
  };

  return (
    <MobilePage
      home
      tabs="manager"
      right={
        <Link to={ROUTES.profile} aria-label="Profile">
          <UserAvatar name={user?.name || 'U'} tone="info" className="size-9" />
        </Link>
      }
    >
      <div className="flex items-end justify-between">
        <div>
          <div className="text-body text-ink-3">{greeting(now)},</div>
          <div className="text-[22px] font-semibold text-primary">{user?.name || 'there'}</div>
        </div>
        <Badge variant={user?.role === ROLES.subcontractor ? 'neutral' : 'highlight'}>{roleLabel}</Badge>
      </div>

      {unmarked && unmarked.n > 0 ? (
        <Link to={ROUTES.branch.teamAttendance(unmarked.b._id)} onClick={() => setSelectedBranchName(unmarked.b.name)} className="flex items-center gap-3 rounded-[14px] border border-tone-warn-fg/30 bg-tone-warn-soft p-4 text-ink-1">
          <IconTile icon={Users} tone="warn" className="size-10" />
          <span className="flex-1">
            <span className="block text-[14.5px] font-semibold">{unmarked.n} labour not marked</span>
            <span className="text-small text-ink-3">{unmarked.b.name} · tap to mark attendance</span>
          </span>
          <ChevronRight className="size-4 text-ink-3" />
        </Link>
      ) : null}

      <PunchHero
        now={now}
        punch={punch}
        todayIn={todayIn}
        elapsedMin={elapsedMin}
        sites={siteNames}
        onPunch={() => navigate(ROUTES.punch)}
        noSiteHint={user?.role === ROLES.subcontractor ? 'You can punch in once a site is assigned' : undefined}
      />

      {branches.length > 0 ? (
        <>
          <MobileCard className="flex flex-col gap-3 !py-3">
            <div className="flex items-center gap-3">
              <IconTile icon={KeyRound} tone="brand" />
              <div className="flex-1">
                <div className="text-[14.5px] font-semibold text-ink-1">Attendance code</div>
                <div className="text-small text-ink-3">For workers whose selfie fails</div>
              </div>
              <Button variant="outline" size="sm" className="!h-10" onClick={() => setShowCode((v) => !v)}>
                {showCode ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showCode ? (
              loading ? (
                <p className="text-center text-small text-ink-3">Loading attendance codes…</p>
              ) : error ? (
                <p className="text-center text-small text-tone-bad-fg">{error}</p>
              ) : attendanceCodes.length === 0 ? (
                <p className="text-center text-small text-ink-3">No attendance codes available.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceCodes.map((attendance) => (
                    <div key={attendance.branchId} className="rounded-control bg-surface-subtle px-4 py-3 text-center">
                      <p className="text-small font-semibold text-ink-2">{attendance.branchName || 'Assigned branch'}</p>
                      <p className="mt-1 text-[28px] font-bold tracking-[0.35em] tabular-nums text-primary">{attendance.code}</p>
                    </div>
                  ))}
                  <p className="text-center text-caption text-ink-3">Valid for today only</p>
                </div>
              )
            ) : null}
          </MobileCard>

          <MobileCard
            title="My projects"
            action={
              <Link to="/supervisor/projects" className="text-[13.5px] font-semibold text-primary">
                All
              </Link>
            }
          >
            <ul>
              {branches.map((b) => {
                const st = projectStats[b._id];
                return (
                  <li key={b._id} className="border-b border-line last:border-b-0">
                    <Button type="button" variant="ghost" className="!h-auto w-full justify-start gap-3 rounded-none px-0 py-3 font-normal hover:bg-transparent" onClick={() => openProject(b)}>
                      <IconTile icon={MapPinned} tone="highlight" />
                      <span className="flex-1 text-left">
                        <span className="block text-[14.5px] font-semibold text-ink-1">{b.name}</span>
                        <span className="text-small text-ink-3">{st ? `${st.labour} labour · ${st.marked} marked today` : 'Site'}</span>
                      </span>
                      <ChevronRight className="text-ink-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </MobileCard>
        </>
      ) : (
        <MobileCard>
          <EmptyState icon={FolderKanban} title="No projects assigned yet" description="Ask the office to add you to a site. Your team, tasks and materials will show here." />
        </MobileCard>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <MobileTile icon={CalendarDays} title="My attendance" subtitle="Calendar & history" to="/my-attendance" />
        <MobileTile icon={FileText} title="Leave" subtitle="Apply or track" to="/leaves" />
        <MobileTile icon={Receipt} title="Reimbursement" subtitle="Claim expenses" to={ROUTES.reimbursements} />
        <MobileTile icon={RefreshCw} title="Sync" subtitle={queued ? `${queued} waiting` : 'All synced'} to={ROUTES.connectServer} />
      </div>
    </MobilePage>
  );
};

export default SupervisorDashboard;
