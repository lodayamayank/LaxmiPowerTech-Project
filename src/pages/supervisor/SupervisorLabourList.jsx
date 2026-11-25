// src/pages/supervisor/SupervisorLabourList.jsx  (route: /branch/:branchId/labours, mobile)
// Laid out with the mobile shell: search, the project's labour (tap for details, delete with a confirmation) and a
// per-day Present / Half day / Absent marking tab. The requests are unchanged; the delete confirmation is a
// ConfirmDialog instead of window.confirm.
import React, { useState, useEffect } from 'react';
import { ROLES } from '@/lib/constants';
import { ROUTES } from '@/lib/routes';
import { getSelectedBranchName } from '@/lib/branchContext';
import { getToken } from '@/lib/session';
import { fetchUsersCached } from '@/hooks/useUsers';
import { queryClient } from '@/lib/queryClient';
import { USERS_KEY } from '@/hooks/useUsers';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '@/api/client';
import { Phone, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChoiceChips } from '@/components/common/ChoiceChips';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/PageLoader';
import { SearchInput } from '@/components/common/SearchInput';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { UserAvatar } from '@/components/common/UserAvatar';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';

const SupervisorLabourList = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [labours, setLabours] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'attendance'
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const token = getToken();

  useEffect(() => {
    fetchLabours();
    fetchProjectName();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  }, [branchId]);

  // Fetch existing attendance when date changes or when switching to attendance tab
  useEffect(() => {
    if (activeTab === 'attendance' && branchId && selectedDate) {
      fetchExistingAttendance(selectedDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  }, [activeTab, selectedDate, branchId]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const fetchProjectName = () => {
    const storedBranchName = getSelectedBranchName();
    if (storedBranchName) {
      setProjectName(storedBranchName);
    }
  };

  const fetchLabours = async () => {
    try {
      setLoading(true);
      const res = { data: await fetchUsersCached({ role: 'labour', branch: branchId }) };
      
      // Filter labours assigned to this branch
      const filteredLabours = res.data.filter(labour => 
        labour.role === ROLES.labour && 
        labour.assignedBranches?.some(branch => 
          typeof branch === 'object' ? branch._id === branchId : branch === branchId
        )
      );
      
      setLabours(filteredLabours);
    } catch (err) {
      console.error('Failed to fetch labours', err);
      setLabours([]);
    } finally {
      setLoading(false);
    }
  };

  const [deleting, setDeleting] = useState(null); // { id, name } waiting for the ConfirmDialog

  const handleDeleteLabour = async (labourId) => {
    setDeleting(null);
    try {
      await axios.delete(`/users/${labourId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success('Labour deleted');
      // Remove from local state immediately
      setLabours(labours.filter(l => l._id !== labourId));
    } catch (err) {
      console.error('Failed to delete labour:', err);
      toast.error('Couldn\u2019t delete the labour', { description: 'Check your connection and try again.', action: { label: 'Retry', onClick: () => handleDeleteLabour(labourId) } });
    }
  };

  const handleAttendanceChange = (labourId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [labourId]: status
    }));
  };

  const fetchExistingAttendance = async (date) => {
    try {
      const res = await axios.get('/attendance/by-date', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          branch: branchId,
          date: date
        }
      });
      
      // Convert attendance records to state format
      const existingData = {};
      res.data.forEach(record => {
        // Handle both populated and non-populated user field
        const userId = record.user?._id || record.user;
        const status = record.punchType; // 'present', 'absent', 'half-day'
        existingData[userId] = status;
      });
      setAttendanceData(existingData);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      // Reset attendance data if fetch fails
      setAttendanceData({});
    }
  };

  const handleMarkAttendance = async () => {
    try {
      const attendanceRecords = Object.entries(attendanceData).map(([labourId, status]) => ({
        user: labourId,
        branch: branchId,
        status,
        date: selectedDate
      }));

      await axios.post('/attendance/bulk', { records: attendanceRecords }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Attendance saved', { description: `${attendanceRecords.length} labour \u00b7 ${new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` });
      // Refresh attendance data after saving
      fetchExistingAttendance(selectedDate);
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      toast.error('Couldn\u2019t save attendance', { description: 'Check your connection and try again.', action: { label: 'Retry', onClick: () => handleMarkAttendance() } });
    }
  };

  const filteredLabours = labours.filter(labour =>
    labour.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    labour.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    labour.mobileNumber?.includes(searchTerm)
  );

  if (loading) return <PageLoader label="Loading labour" />;

  const markCount = Object.keys(attendanceData).length;

  return (
    <MobilePage
      title="Labour"
      back
      onBack={() => navigate(ROUTES.branch.labourDashboard(branchId))}
      tabs="manager"
      right={
        <Button size="icon" aria-label="Add labour" onClick={() => navigate(ROUTES.branch.laboursAdd(branchId))}>
          <Plus />
        </Button>
      }
      footer={
        activeTab === 'attendance' && markCount > 0 ? (
          <Button size="xl" className="w-full" onClick={handleMarkAttendance}>
            Save attendance &middot; {markCount} marked
          </Button>
        ) : null
      }
    >
      <p className="-mb-1 text-small text-ink-3">Project: {projectName || '...'}</p>
      <SegmentedControl
        aria-label="View"
        className="w-full [&>*]:flex-1"
        options={[
          { value: 'all', label: 'All labour' },
          { value: 'attendance', label: 'Attendance' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
      <SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm('')} placeholder="Search labour..." label="Search labour" />

      {activeTab === 'all' && (
        <>
          {filteredLabours.length === 0 ? (
            <MobileCard>
              <EmptyState
                icon={Users}
                title="No labour found"
                description={searchTerm ? 'Try a different search term.' : 'No labour is assigned to this project yet.'}
                action={
                  <Button onClick={() => navigate(ROUTES.branch.laboursAdd(branchId))}>
                    <Plus /> Add first labour
                  </Button>
                }
              />
            </MobileCard>
          ) : (
            <MobileCard className="!py-1">
              {filteredLabours.map((labour) => (
                <div key={labour._id} className="flex items-center gap-2 border-b border-line py-3 last:border-b-0">
                  <Button type="button" variant="ghost" className="!h-auto min-w-0 flex-1 justify-start gap-3 px-0 font-normal hover:bg-transparent" onClick={() => navigate(ROUTES.branch.labourDetail(branchId, labour._id))}>
                    <UserAvatar name={labour.name || 'L'} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[14.5px] font-semibold text-ink-1">{labour.name || 'Unnamed labour'}</span>
                      <span className="block truncate text-small text-ink-3">{labour.username || 'No username'}</span>
                      {labour.mobileNumber ? (
                        <span className="mt-0.5 flex items-center gap-1 text-small text-ink-3">
                          <Phone className="size-3" /> {labour.mobileNumber}
                        </span>
                      ) : null}
                    </span>
                    {labour.jobTitle ? <Badge variant="info">{labour.jobTitle}</Badge> : null}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${labour.name || 'labour'}`} className="text-tone-bad-fg" onClick={() => setDeleting({ id: labour._id, name: labour.name })}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </MobileCard>
          )}
        </>
      )}

      {activeTab === 'attendance' && (
        <>
          {filteredLabours.length === 0 ? (
            <MobileCard>
              <EmptyState icon={Users} title="No labour available" description="Add labour first to mark attendance." />
            </MobileCard>
          ) : (
            <>
              <Input type="date" aria-label="Date for attendance" value={selectedDate} max={new Date().toISOString().split('T')[0]} onChange={handleDateChange} />
              <MobileCard className="!py-1">
                {filteredLabours.map((labour) => (
                  <div key={labour._id} className="flex flex-col gap-2.5 border-b border-line py-3 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={labour.name || 'L'} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-semibold text-ink-1">{labour.name || 'Unnamed labour'}</div>
                        <div className="text-small text-ink-3">{labour.jobTitle || 'No designation'}</div>
                      </div>
                    </div>
                    <ChoiceChips
                      aria-label={`Mark ${labour.name || 'labour'}`}
                      className="flex-nowrap [&>*]:flex-1 [&>*]:justify-center"
                      options={[
                        { value: 'present', label: 'Present' },
                        { value: 'half-day', label: 'Half day' },
                        { value: 'absent', label: 'Absent' },
                      ]}
                      value={attendanceData[labour._id] || ''}
                      onChange={(status) => handleAttendanceChange(labour._id, status)}
                    />
                  </div>
                ))}
              </MobileCard>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this labour?"
        description={`Are you sure you want to delete ${deleting?.name || 'this person'}?`}
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={() => handleDeleteLabour(deleting.id)}
      />
    </MobilePage>
  );
};

export default SupervisorLabourList;
