import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { toast } from 'react-toastify';
import {
    FaRupeeSign,
    FaCalendarAlt,
    FaFileDownload,
    FaSearch,
    FaFilter,
    FaLock,
    FaLockOpen,
    FaCheckCircle,
    FaClock,
    FaTimesCircle,
    FaEye,
    FaTrash,
} from 'react-icons/fa';
import Select from '../components/Select';

const SalaryHistory = () => {
    const [slips, setSlips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        month: '',
        year: new Date().getFullYear(),
        paymentStatus: '',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSlip, setSelectedSlip] = useState(null);

    const token = localStorage.getItem('token');

    // Fetch salary slips
    const fetchSlips = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.month) params.month = filters.month;
            if (filters.year) params.year = filters.year;
            if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;

            const res = await axios.get('/salary-slips', {
                params,
                headers: { Authorization: `Bearer ${token}` },
            });
            setSlips(res.data.slips || []);
        } catch (err) {
            console.error('Failed to fetch salary slips:', err);
            toast.error('Failed to load salary history');
            setSlips([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlips();
    }, [filters]);

    // Filter data based on search
    const filteredSlips = useMemo(() => {
        return slips.filter((slip) =>
            slip.employeeDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            slip.employeeDetails.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            slip.employeeDetails.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [slips, searchTerm]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaClock },
            processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaClock },
            paid: { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle },
            failed: { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle },
        };
        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text} flex items-center gap-1`}>
                <Icon size={10} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // Mark as paid
    const markAsPaid = async (slipId) => {
        if (!window.confirm('Mark this salary slip as paid?')) return;

        try {
            await axios.patch(
                `/salary-slips/${slipId}/payment`,
                {
                    paymentStatus: 'paid',
                    paymentDate: new Date().toISOString(),
                    paymentMethod: 'Bank Transfer',
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            toast.success('Marked as paid successfully');
            fetchSlips();
        } catch (err) {
            console.error('Failed to mark as paid:', err);
            toast.error('Failed to update payment status');
        }
    };

    // Delete slip
    const deleteSlip = async (slipId) => {
        if (!window.confirm('Are you sure you want to delete this salary slip?')) return;

        try {
            await axios.delete(`/salary-slips/${slipId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Salary slip deleted successfully');
            fetchSlips();
        } catch (err) {
            console.error('Failed to delete slip:', err);
            toast.error(err.response?.data?.message || 'Failed to delete slip');
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <DashboardLayout title="Salary History">
            <div className="space-y-6">
                {/* Header with Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, username, or employee ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Select
                                value={filters.month}
                                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                                options={[
                                    { value: '', label: 'All Months' },
                                    ...monthNames.map((name, index) => ({
                                        value: (index + 1).toString(),
                                        label: name
                                    }))
                                ]}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700"
                            />
                            <Select
                                value={filters.year}
                                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                                options={[2024, 2025, 2026, 2027].map((y) => ({
                                    value: y.toString(),
                                    label: y.toString()
                                }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700"
                            />
                            <Select
                                value={filters.paymentStatus}
                                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                                options={[
                                    { value: '', label: 'All Status' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'processing', label: 'Processing' },
                                    { value: 'paid', label: 'Paid' },
                                    { value: 'failed', label: 'Failed' }
                                ]}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {!loading && filteredSlips.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700 border-b">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Employee</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Period</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Gross</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Deductions</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Net</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSlips.map((slip) => (
                                        <tr key={slip._id} className="border-b dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{slip.employeeDetails.name}</p>
                                                    <p className="text-sm text-gray-500">@{slip.employeeDetails.username}</p>
                                                    <p className="text-xs text-gray-400">{slip.employeeDetails.employeeId}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-medium">{monthNames[slip.month - 1]}</span>
                                                    <span className="text-xs text-gray-500">{slip.year}</span>
                                                    {slip.locked && <FaLock className="text-orange-500 mt-1" size={12} />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {formatCurrency(slip.grossSalary)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                                                {formatCurrency(slip.deductions.total)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <p className="font-bold text-green-600 dark:text-green-400">
                                                    {formatCurrency(slip.netSalary)}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(slip.paymentStatus)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedSlip(slip)}
                                                        className="text-blue-500 hover:text-blue-600"
                                                        title="View Details"
                                                    >
                                                        <FaEye size={16} />
                                                    </button>
                                                    {slip.paymentStatus === 'pending' && !slip.locked && (
                                                        <>
                                                            <button
                                                                onClick={() => markAsPaid(slip._id)}
                                                                className="text-green-500 hover:text-green-600"
                                                                title="Mark as Paid"
                                                            >
                                                                <FaCheckCircle size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteSlip(slip._id)}
                                                                className="text-red-500 hover:text-red-600"
                                                                title="Delete"
                                                            >
                                                                <FaTrash size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Results Summary */}
                    {!loading && filteredSlips.length > 0 && (
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                            Showing {filteredSlips.length} of {slips.length} salary slips
                        </div>
                    )}

                    {/* No Data */}
                    {!loading && filteredSlips.length === 0 && (
                        <div className="text-center py-12">
                            <FaFileDownload size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">No Salary Slips</h3>
                            <p className="text-gray-500 dark:text-gray-400">No salary slips found for the selected filters.</p>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400">Loading salary history...</p>
                        </div>
                    )}
                </div>

                {/* Slip Detail Modal */}
                {selectedSlip && (
                    <SlipDetailModal
                        slip={selectedSlip}
                        onClose={() => setSelectedSlip(null)}
                        formatCurrency={formatCurrency}
                        monthNames={monthNames}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

// Slip Detail Modal Component
const SlipDetailModal = ({ slip, onClose, formatCurrency, monthNames }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Salary Slip</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {monthNames[slip.month - 1]} {slip.year} • {slip.employeeDetails.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <FaTimesCircle size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Employee Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Employee Information</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                                <p className="font-medium">{slip.employeeDetails.name}</p>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                                <p className="font-medium">{slip.employeeDetails.employeeId}</p>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Role:</span>
                                <p className="font-medium">{slip.employeeDetails.role}</p>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-400">Department:</span>
                                <p className="font-medium">{slip.employeeDetails.department || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Salary Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Attendance */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                <FaCalendarAlt className="text-blue-500" />
                                Attendance
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Present:</span>
                                    <span className="font-medium">{slip.attendance.presentDays}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Absent:</span>
                                    <span className="font-medium">{slip.attendance.absentDays}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Half Days:</span>
                                    <span className="font-medium">{slip.attendance.halfDays}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Paid Leave:</span>
                                    <span className="font-medium">{slip.attendance.effectivePaidLeaveDays || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Earnings */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                <FaRupeeSign className="text-green-500" />
                                Earnings
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Gross Salary:</span>
                                    <span className="font-medium">{formatCurrency(slip.grossSalary)}</span>
                                </div>
                                {slip.travel && slip.travel.total > 0 && (
                                    <div className="flex justify-between">
                                        <span>Travel:</span>
                                        <span className="font-medium">{formatCurrency(slip.travel.total)}</span>
                                    </div>
                                )}
                                {slip.overtime && slip.overtime.total > 0 && (
                                    <div className="flex justify-between">
                                        <span>Overtime:</span>
                                        <span className="font-medium">{formatCurrency(slip.overtime.total)}</span>
                                    </div>
                                )}
                                {slip.reimbursements && slip.reimbursements.total > 0 && (
                                    <div className="flex justify-between">
                                        <span>Reimbursements:</span>
                                        <span className="font-medium">{formatCurrency(slip.reimbursements.total)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Deductions */}
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Deductions</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Absent:</span>
                                    <span className="font-medium text-red-600">{formatCurrency(slip.deductions.absent)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Half Day:</span>
                                    <span className="font-medium text-red-600">{formatCurrency(slip.deductions.halfDay)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Unpaid Leave:</span>
                                    <span className="font-medium text-red-600">{formatCurrency(slip.deductions.unpaidLeave)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="font-semibold">Total:</span>
                                    <span className="font-bold text-red-600">{formatCurrency(slip.deductions.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Salary */}
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm opacity-90">Net Salary</p>
                                <p className="text-4xl font-bold mt-1">{formatCurrency(slip.netSalary)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-90">Payment Status</p>
                                <p className="text-lg font-semibold mt-1">
                                    {slip.paymentStatus.charAt(0).toUpperCase() + slip.paymentStatus.slice(1)}
                                </p>
                                {slip.paymentDate && (
                                    <p className="text-xs opacity-75 mt-1">
                                        Paid on {new Date(slip.paymentDate).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalaryHistory;