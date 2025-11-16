import DashboardLayout from '../layouts/DashboardLayout';
import React, { useEffect, useState } from 'react';
import axios from '../utils/axios';
import Select from '../components/Select';
import {
  FaUser, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaAngleDoubleLeft,
  FaAngleDoubleRight, FaDownload, FaSearch, FaCheckCircle, FaTimesCircle, FaClock
} from 'react-icons/fa';

const LabourAttendanceDashboard = () => {
  const [records, setRecords] = useState([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/attendance/summary', {
          headers: { Authorization: `Bearer ${token}` },
          params: { role: 'labour', month, year },
        });
        setRecords(res.data || []);
      } catch (err) {
        console.error('Failed to fetch labour summary', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, month, year]);

  const filtered = records.filter((r) =>
    r.name?.toLowerCase().includes(searchStaff.toLowerCase())
  );

  const totals = filtered.reduce((acc, item) => ({
    present: acc.present + (item.present || 0),
    absent: acc.absent + (item.absent || 0),
    overtime: acc.overtime + (item.overtime || 0),
  }), { present: 0, absent: 0, overtime: 0 });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filtered.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [searchStaff, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [], maxShow = 5;
    if (totalPages <= maxShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const exportToCSV = () => {
    if (!filtered.length) { alert("No records to export"); return; }
    const headers = ["Name", "Employee ID", "Present", "Absent", "Half Day", "Week Off", "Paid Leave", "Unpaid Leave", "Sick Leave", "Casual Leave", "Overtime"];
    const rows = filtered.map((item) => [item.name, item.employeeId, item.present, item.absent, item.halfDay, item.weekOff, item.paidLeave || 0, item.unpaidLeave || 0, item.sickLeave || 0, item.casualLeave || 0, item.overtime]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Labour_Attendance_${month}_${year}.csv`;
    link.click();
  };

  return (
    <DashboardLayout title="Labour Attendance">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-500">Monthly attendance overview for labour workers</p>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-md">
            <FaDownload size={14} />Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Labour", value: filtered.length, color: "gray", icon: FaUser },
            { label: "Total Present", value: totals.present, color: "green", icon: FaCheckCircle },
            { label: "Total Absent", value: totals.absent, color: "red", icon: FaTimesCircle },
            { label: "Total Overtime", value: totals.overtime, color: "orange", icon: FaClock }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  <p className={`text-3xl font-bold text-${stat.color}-600 mt-1`}>{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full bg-${stat.color}-100 flex items-center justify-center`}>
                  <stat.icon className={`text-${stat.color}-600`} size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Search Labour</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500" placeholder="Search by name..." value={searchStaff} onChange={(e) => setSearchStaff(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Month</label>
              <Select value={month} onChange={(e) => setMonth(e.target.value)} options={[...Array(12).keys()].map((m) => ({ value: m + 1, label: new Date(0, m).toLocaleString('default', { month: 'long' }) }))} icon={<FaCalendarAlt size={14} />} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
              <Select value={year} onChange={(e) => setYear(e.target.value)} options={Array.from({ length: 5 }, (_, i) => ({ value: new Date().getFullYear() - i, label: (new Date().getFullYear() - i).toString() }))} icon={<FaCalendarAlt size={14} />} />
            </div>
          </div>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="flex justify-between bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-600">Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, totalItems)}</span> of <span className="font-semibold">{totalItems}</span></div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows:</label>
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm">
                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>{["Name", "Employee ID", "Present", "Absent", "Half Day", "Week Off", "Paid Leave", "Unpaid Leave", "Sick Leave", "Casual Leave", "Overtime"].map(h => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr> : 
               filtered.length === 0 ? <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-500">No records</td></tr> :
               currentItems.map((item, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.employeeId}</td>
                  <td className="px-4 py-3">{item.present}</td>
                  <td className="px-4 py-3">{item.absent}</td>
                  <td className="px-4 py-3">{item.halfDay}</td>
                  <td className="px-4 py-3">{item.weekOff}</td>
                  <td className="px-4 py-3">{item.paidLeave}</td>
                  <td className="px-4 py-3">{item.unpaidLeave}</td>
                  <td className="px-4 py-3">{item.sickLeave}</td>
                  <td className="px-4 py-3">{item.casualLeave}</td>
                  <td className="px-4 py-3">{item.overtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex justify-between bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm">Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span></div>
            <div className="flex gap-2">
              {[
                { icon: FaAngleDoubleLeft, onClick: () => goToPage(1), disabled: currentPage === 1 },
                { icon: FaChevronLeft, onClick: () => goToPage(currentPage - 1), disabled: currentPage === 1 }
              ].map((btn, i) => <button key={i} onClick={btn.onClick} disabled={btn.disabled} className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"><btn.icon size={14} /></button>)}
              
              <div className="flex gap-1">
                {getPageNumbers().map((page, idx) => page === '...' ? 
                  <span key={idx} className="px-3 py-1">...</span> : 
                  <button key={page} onClick={() => goToPage(page)} className={`px-3 py-1 rounded-lg text-sm font-medium ${currentPage === page ? 'bg-orange-500 text-white shadow-md' : 'border hover:bg-gray-50'}`}>{page}</button>
                )}
              </div>

              {[
                { icon: FaChevronRight, onClick: () => goToPage(currentPage + 1), disabled: currentPage === totalPages },
                { icon: FaAngleDoubleRight, onClick: () => goToPage(totalPages), disabled: currentPage === totalPages }
              ].map((btn, i) => <button key={i} onClick={btn.onClick} disabled={btn.disabled} className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"><btn.icon size={14} /></button>)}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LabourAttendanceDashboard;