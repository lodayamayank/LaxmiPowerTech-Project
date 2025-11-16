import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { useSearchParams } from 'react-router-dom';

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
        <div className="bg-white p-4 rounded shadow w-[260px] flex flex-col gap-6">
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
            value={`${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}`}
            onChange={(e) => setSelectedMonth(new Date(e.target.value))}
          />
        </div>

        {/* Right Panel */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              placeholder="Search Staff Name / Phone No."
              className="border p-2 rounded w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-orange-500 text-white px-4 py-2 rounded">Download Report</button>
          </div>

          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-black">Name</th>
                <th className="border p-2 text-black">Employee ID</th>
                <th className="border p-2 text-black">Present</th>
                <th className="border p-2 text-black">Absent</th>
                <th className="border p-2 text-black">Half Day</th>
                <th className="border p-2 text-black">Week off</th>
                <th className="border p-2 text-black">Paid Leave</th>
                <th className="border p-2 text-black">Unpaid Leave</th>
                <th className="border p-2 text-black">Overtime</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.user._id}>
                  <td className="border p-2 text-black">{item.user.name}</td>
                  <td className="border p-2 text-black">{item.user.employeeId || '-'}</td>
                  <td className="border p-2 text-center">{item.present}</td>
                  <td className="border p-2 text-center">{item.absent}</td>
                  <td className="border p-2 text-center">{item.halfDay}</td>
                  <td className="border p-2 text-center">{item.weekOff}</td>
                  <td className="border p-2 text-center">{item.paidLeave}</td>
                  <td className="border p-2 text-center">{item.unpaidLeave}</td>
                  <td className="border p-2 text-center">{item.overtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;
