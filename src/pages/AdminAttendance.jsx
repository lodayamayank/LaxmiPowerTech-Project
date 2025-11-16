import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';

const AdminAttendance = ({role}) => {
  const [summary, setSummary] = useState([]);
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
      fetchAttendanceSummary();
    }
  }, [selectedProject, selectedMonth]);

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

  const fetchAttendanceSummary = async () => {
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
  };

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
        <div className="flex flex-wrap gap-4 mb-6">
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

          <input
            type="month"
            className="border p-2 rounded"
            onChange={handleMonthChange}
            value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`}
          />

          <input
            type="text"
            placeholder="Search Staff Name / Phone No."
            className="border p-2 rounded flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button className="bg-orange-500 text-white px-4 py-2 rounded">Download Report</button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Employee ID</th>
                <th className="p-2 border">Present</th>
                <th className="p-2 border">Absent</th>
                <th className="p-2 border">Half Day</th>
                <th className="p-2 border">Week off</th>
                <th className="p-2 border">Paid Leave</th>
                <th className="p-2 border">Unpaid Leave</th>
                <th className="p-2 border">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummary.map((item) => (
                <tr key={item.user._id}>
                  <td className="p-2 border">{item.user.name}</td>
                  <td className="p-2 border">{item.user.employeeId || '-'}</td>
                  <td className="p-2 border text-center">{item.present}</td>
                  <td className="p-2 border text-center">{item.absent}</td>
                  <td className="p-2 border text-center">{item.halfDay}</td>
                  <td className="p-2 border text-center">{item.weekOff}</td>
                  <td className="p-2 border text-center">{item.paidLeave}</td>
                  <td className="p-2 border text-center">{item.unpaidLeave}</td>
                  <td className="p-2 border text-center">{item.overtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAttendance;
