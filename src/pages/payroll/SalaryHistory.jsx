// src/pages/payroll/SalaryHistory.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { getToken } from '@/lib/session';
import DashboardLayout from '@/layouts/desktop/DashboardLayout';
import axios from '@/api/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterBar, FilterField } from '@/components/common/FilterBar';
import { PageHeader } from '@/components/common/PageHeader';
import { PaginationBar } from '@/components/common/PaginationBar';
import { SearchInput } from '@/components/common/SearchInput';
import { SectionCard } from '@/components/common/SectionCard';
import SlipDetailsDialog from './components/SlipDetailsDialog';
import { getSlipColumns, getSlipMobileCard } from './components/slipColumns';
import { MONTH_NAMES } from './payrollFormat';

const ALL = '__all__'; // Radix SelectItem cannot use ''; mapped back to '' before touching filters
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const STATUS_OPTIONS = [
  ['pending', 'Pending'],
  ['processing', 'Processing'],
  ['paid', 'Paid'],
  ['failed', 'Failed'],
];

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
    const [confirmAction, setConfirmAction] = useState(null);
    // Client-side paging over the filtered list (new footer; the API call is unchanged).
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const token = getToken();

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

    // Mark as paid
    const markAsPaid = async (slipId) => {
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

    const monthNames = MONTH_NAMES;

    const columns = useMemo(() => getSlipColumns({ onView: setSelectedSlip, onConfirm: setConfirmAction }), []);
    const mobileCard = useMemo(() => getSlipMobileCard({ onView: setSelectedSlip, onConfirm: setConfirmAction }), []);

    // Back to the first page whenever the list changes.
    useEffect(() => {
        setPage(1);
    }, [filteredSlips, pageSize]);

    const totalPages = Math.max(Math.ceil(filteredSlips.length / pageSize), 1);
    const currentPage = Math.min(page, totalPages);
    const pageRows = useMemo(
        () => filteredSlips.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [filteredSlips, currentPage, pageSize]
    );

    const defaultYear = new Date().getFullYear();
    const hasFilters = Boolean(searchTerm || filters.month || filters.paymentStatus || filters.year !== defaultYear);
    const clearFilters = () => {
        setSearchTerm('');
        setFilters({ month: '', year: defaultYear, paymentStatus: '' });
    };

    const runConfirmed = async () => {
        const action = confirmAction;
        setConfirmAction(null);

        if (action?.type === 'paid') {
            await markAsPaid(action.slipId);
        } else if (action?.type === 'delete') {
            await deleteSlip(action.slipId);
        }
    };

    return (
      <DashboardLayout>
        <PageHeader
          eyebrow="Payroll / Salary history"
          title="Salary history"
          description="Past salary runs, slips and payment status."
        />

        <SectionCard flush>
          <FilterBar onClear={clearFilters} showClear={hasFilters}>
            <FilterField label="Search employee" htmlFor="slip-search" grow={22} minWidth={220}>
              <SearchInput
                id="slip-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClear={() => setSearchTerm('')}
                placeholder="Search by name, username, or employee ID..."
              />
            </FilterField>
            <FilterField label="Month" htmlFor="slip-month" grow={14} minWidth={140} maxWidth={220}>
              <Select
                value={filters.month || ALL}
                onValueChange={(value) => setFilters({ ...filters, month: value === ALL ? '' : value })}
              >
                <SelectTrigger id="slip-month">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Months</SelectItem>
                  {monthNames.map((name, index) => (
                    <SelectItem key={name} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Year" htmlFor="slip-year" grow={10} minWidth={120} maxWidth={160}>
              <Select value={String(filters.year)} onValueChange={(value) => setFilters({ ...filters, year: Number(value) })}>
                <SelectTrigger id="slip-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Status" htmlFor="slip-status" grow={12} minWidth={140} maxWidth={200}>
              <Select
                value={filters.paymentStatus || ALL}
                onValueChange={(value) => setFilters({ ...filters, paymentStatus: value === ALL ? '' : value })}
              >
                <SelectTrigger id="slip-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Status</SelectItem>
                  {STATUS_OPTIONS.map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>

          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey="_id"
            loading={loading}
            mobileCard={mobileCard}
            emptyState={
              <EmptyState icon={FileText} title="No Salary Slips" description="No salary slips found for the selected filters." />
            }
            footer={
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredSlips.length}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            }
          />
        </SectionCard>

        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => {
            if (!open) setConfirmAction(null);
          }}
          title={confirmAction?.type === 'paid' ? 'Mark salary as paid?' : 'Delete salary slip?'}
          description={
            confirmAction?.type === 'paid'
              ? 'Are you sure you want to mark this salary slip as paid?'
              : 'Are you sure you want to delete this salary slip? This action cannot be undone.'
          }
          tone={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
          onConfirm={runConfirmed}
        />

        <SlipDetailsDialog slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
      </DashboardLayout>
    );
};

export default SalaryHistory;
