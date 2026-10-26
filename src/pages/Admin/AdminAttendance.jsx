import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import axios from '../utils/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// NOTE: assumes the standard shadcn files exist at these paths.
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const AdminAttendance = ({role}) => {
  const [summary, setSummary] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('token');

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  }, [token]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchAttendanceSummary = useCallback(async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const res = await axios.get(
        `/attendance/summary?project=${selectedProject}&month=${month}&year=${year}&role=${role}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch attendance summary', err);
    }
  }, [role, selectedMonth, selectedProject, token]);

  useEffect(() => {
    if (selectedProject && selectedMonth) {
      fetchAttendanceSummary();
    }
  }, [fetchAttendanceSummary, selectedProject, selectedMonth]);

  const handleMonthChange = (e) => {
    const date = new Date(e.target.value);
    setSelectedMonth(date);
  };

  const filteredSummary = summary.filter(item =>
    item.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Attendance Staff Dashboard</h1>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap gap-4 p-4">
            {/* Native select retained: preserves selectedProject (project _id) and onChange exactly */}
            <select
              aria-label="Select project"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Select Project</option>
              {projects.map((proj) => (
                <option key={proj._id} value={proj._id}>{proj.name}</option>
              ))}
            </select>

            <Input
              type="month"
              aria-label="Select month"
              className="w-auto"
              onChange={handleMonthChange}
              value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`}
            />

            <Input
              type="text"
              placeholder="Search Staff Name / Phone No."
              aria-label="Search staff"
              className="flex-1 min-w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* No onClick: unchanged from original (download is not implemented) */}
            <Button className="bg-orange-500 text-white hover:bg-orange-600">Download Report</Button>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm border">
                <TableHeader className="bg-gray-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Name</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Employee ID</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Present</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Absent</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Half Day</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Week off</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Paid Leave</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Unpaid Leave</TableHead>
                    <TableHead className="h-auto p-2 border text-center font-bold text-foreground">Overtime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                  filteredSummary.map((item) => (
                    <TableRow key={item.user._id} className="hover:bg-transparent">
                      <TableCell className="p-2 border whitespace-normal">{item.user.name}</TableCell>
                      <TableCell className="p-2 border whitespace-normal">{item.user.employeeId || '-'}</TableCell>
                      <TableCell className="p-2 border text-center">{item.present}</TableCell>
                      <TableCell className="p-2 border text-center">{item.absent}</TableCell>
                      <TableCell className="p-2 border text-center">{item.halfDay}</TableCell>
                      <TableCell className="p-2 border text-center">{item.weekOff}</TableCell>
                      <TableCell className="p-2 border text-center">{item.paidLeave}</TableCell>
                      <TableCell className="p-2 border text-center">{item.unpaidLeave}</TableCell>
                      <TableCell className="p-2 border text-center">{item.overtime}</TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAttendance;
