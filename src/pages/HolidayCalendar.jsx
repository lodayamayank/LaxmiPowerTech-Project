import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FaCalendarAlt, FaPlus, FaTrash, FaUndo, FaInfoCircle } from 'react-icons/fa';

const HolidayCalendar = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [adding, setAdding] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/holidays', { params: { year } });
      setHolidays(res.data || []);
    } catch (err) {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const activeHolidays = useMemo(() => holidays.filter(h => h.isActive), [holidays]);
  const inactiveHolidays = useMemo(() => holidays.filter(h => !h.isActive), [holidays]);

  const handleAdd = async () => {
    if (!newHoliday.date || !newHoliday.name.trim()) {
      toast.error('Date and name are required');
      return;
    }
    setAdding(true);
    try {
      await axios.post('/holidays', newHoliday);
      toast.success('Holiday added');
      setNewHoliday({ date: '', name: '' });
      setShowAddForm(false);
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"?\n\nIt will be removed from salary calculations but can be restored later.`)) return;
    try {
      await axios.delete(`/holidays/${id}`);
      toast.success(`"${name}" deactivated`);
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to deactivate holiday');
    }
  };

  const handleRestore = async (id, name) => {
    try {
      await axios.patch(`/holidays/${id}/restore`);
      toast.success(`"${name}" restored`);
      fetchHolidays();
    } catch (err) {
      toast.error('Failed to restore holiday');
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getUTCDate();
    const month = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' });
    const year = d.getUTCFullYear();
    const weekday = d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
    return `${day} ${month} ${year} (${weekday})`;
  };

  const years = [2024, 2025, 2026, 2027];

  const HolidayRow = ({ h, isActive }) => (
    <TableRow className={!isActive ? 'opacity-50' : ''}>
      <TableCell className="font-medium">{formatDate(h.date)}</TableCell>
      <TableCell className={!isActive ? 'line-through text-gray-400' : ''}>{h.name}</TableCell>
      <TableCell className="text-center">
        <Badge
          variant="outline"
          className={
            h.source === 'manual'
              ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300'
              : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
          }
        >
          {h.source === 'manual' ? 'Manual' : 'System (India)'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge
          variant="outline"
          className={
            isActive
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }
        >
          {isActive ? 'Active' : 'Deactivated'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        {isActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(h._id, h.name)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Deactivate holiday"
          >
            <FaTrash size={12} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRestore(h._id, h.name)}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Restore holiday"
          >
            <FaUndo size={12} />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );

  const displayHolidays = showInactive ? holidays : activeHolidays;

  return (
    <DashboardLayout title="Holiday Calendar">
      <div className="space-y-6">
        {/* Header card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <FaCalendarAlt className="text-orange-500" size={20} />
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Holiday Calendar — India</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {activeHolidays.length} active &nbsp;·&nbsp; {inactiveHolidays.length} deactivated
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="accent-orange-500 w-4 h-4"
                  />
                  Show deactivated
                </label>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <FaPlus />
                  Add Holiday
                </Button>
              </div>
            </div>

            {showAddForm && (
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Add Manual Holiday</h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Holiday name (e.g. Company Foundation Day)"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday((p) => ({ ...p, name: e.target.value }))}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm flex-1 min-w-52"
                  />
                  <Button onClick={handleAdd} disabled={adding} className="bg-green-500 hover:bg-green-600">
                    {adding ? 'Adding...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
          <FaInfoCircle className="mt-0.5 shrink-0" />
          <p>
            System holidays are sourced from India's public holiday list. You can <strong>deactivate</strong> any holiday
            (system or manual) to exclude it from salary calculations — deactivated holidays can be restored at any time.
            Only <strong>active</strong> holidays count as paid/unpaid leave days in payroll.
          </p>
        </div>

        {/* Holiday table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto" />
                <p className="text-sm text-gray-500 mt-3">Loading holidays...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Holiday Name</TableHead>
                    <TableHead className="text-center">Source</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayHolidays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-500 dark:text-gray-400">
                        No holidays found for {year}. Open this page while connected to load India's public holidays.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayHolidays.map((h) => (
                      <HolidayRow key={h._id} h={h} isActive={h.isActive} />
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HolidayCalendar;
