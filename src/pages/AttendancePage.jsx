import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AttendancePage = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const [data, setData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject && selectedMonth) {
      fetchData();
    }
  }, [selectedProject, selectedMonth, role]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const fetchData = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const res = await axios.get(
        `/attendance/summary?project=${selectedProject}&month=${month}&year=${year}&role=${role}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (err) {
      console.error('Error fetching attendance', err);
    }
  };

  const filteredData = data.filter(item =>
    item.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex gap-4">
        {/* Left Panel */}
        <Card className="bg-white rounded shadow w-[260px] gap-0 py-0 self-start">
          <CardContent className="p-4 flex flex-col gap-6">
            <select
              className="border p-2 rounded"
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
              className="border p-2 rounded h-auto"
              value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
            />
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <Input
              type="text"
              placeholder="Search Staff Name / Phone No."
              className="border p-2 rounded w-80 h-auto"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Download Report</Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full border text-sm">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="border p-2 h-auto text-black">Name</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Employee ID</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Present</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Absent</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Half Day</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Week off</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Paid Leave</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Unpaid Leave</TableHead>
                  <TableHead className="border p-2 h-auto text-black">Overtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.user._id}>
                    <TableCell className="border p-2 text-black">{item.user.name}</TableCell>
                    <TableCell className="border p-2 text-black">{item.user.employeeId || '-'}</TableCell>
                    <TableCell className="border p-2 text-center">{item.present}</TableCell>
                    <TableCell className="border p-2 text-center">{item.absent}</TableCell>
                    <TableCell className="border p-2 text-center">{item.halfDay}</TableCell>
                    <TableCell className="border p-2 text-center">{item.weekOff}</TableCell>
                    <TableCell className="border p-2 text-center">{item.paidLeave}</TableCell>
                    <TableCell className="border p-2 text-center">{item.unpaidLeave}</TableCell>
                    <TableCell className="border p-2 text-center">{item.overtime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;