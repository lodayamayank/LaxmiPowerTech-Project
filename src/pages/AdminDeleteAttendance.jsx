import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { FaExclamationTriangle, FaTrash, FaImage } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Kept in sync with the same literal on the backend
// (laxmipowertech-backend/routes/attendance.routes.js).
const CONFIRMATION_PHRASE = 'DELETE ATTENDANCE RECORDS';

const todayStr = () => new Date().toISOString().split('T')[0];

const AdminDeleteAttendance = () => {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [deleteFromDatabase, setDeleteFromDatabase] = useState(true);
  const [deleteFromCloudinary, setDeleteFromCloudinary] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPreview(null);
    setPreviewError('');

    if (!startDate) return;
    if (endDate && endDate < startDate) {
      setPreviewError('End date cannot be before start date');
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await axios.get('/attendance/admin/delete-preview', {
          params: { startDate, endDate: endDate || startDate },
        });
        if (!cancelled) setPreview(res.data);
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err.response?.data?.message || 'Failed to load preview');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [startDate, endDate]);

  const noTargetSelected = !deleteFromDatabase && !deleteFromCloudinary;

  const openConfirm = () => {
    if (!preview || preview.count === 0 || noTargetSelected) return;
    setConfirmText('');
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (deleting) return;
    setConfirmOpen(false);
    setConfirmText('');
  };

  const handleDelete = async () => {
    if (confirmText !== CONFIRMATION_PHRASE) return;

    setDeleting(true);
    try {
      const res = await axios.delete('/attendance/admin/bulk-delete', {
        data: {
          startDate,
          endDate: endDate || startDate,
          confirmationPhrase: confirmText,
          deleteFromDatabase,
          deleteFromCloudinary,
        },
      });

      const parts = [];
      if (res.data.deleteFromDatabase) {
        parts.push(`${res.data.deletedCount} record(s) removed from the database`);
      }
      if (res.data.deleteFromCloudinary) {
        parts.push(`${res.data.cloudinaryDeleted} selfie(s) removed from Cloudinary`);
      }
      toast.success(parts.join(' and '));

      if (res.data.cloudinaryFailed) {
        toast.warn(`${res.data.cloudinaryFailed} selfie(s) could not be removed from Cloudinary`);
      }

      setConfirmOpen(false);
      setConfirmText('');
      setPreview(null);
      setStartDate(todayStr());
      setEndDate('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete attendance records');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Delete Attendance">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Delete Attendance Records</h1>
          <p className="text-sm text-gray-500 mt-1">
            Permanently remove attendance records — and their selfies on Cloudinary — for a
            specific date or date range. This cannot be undone.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={startDate}
                  max={todayStr()}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  End Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={endDate}
                  min={startDate}
                  max={todayStr()}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to target a single day</p>
              </div>
            </div>

            {previewError && <p className="text-sm text-red-600">{previewError}</p>}

            {previewLoading && <p className="text-sm text-gray-500">Checking matching records…</p>}

            {!previewLoading && preview && (
              <div
                className={`rounded-lg border p-4 text-sm ${
                  preview.count === 0
                    ? 'border-gray-200 bg-gray-50 text-gray-600'
                    : 'border-orange-200 bg-orange-50 text-orange-800'
                }`}
              >
                {preview.count === 0 ? (
                  <p>No attendance records found in the selected period.</p>
                ) : (
                  <>
                    <p className="font-semibold">
                      {preview.count} attendance record{preview.count === 1 ? '' : 's'} will be
                      permanently deleted.
                    </p>
                    <p className="flex items-center gap-1.5 mt-1 text-orange-700">
                      <FaImage size={12} />
                      {preview.withSelfies} of them have a selfie stored on Cloudinary — those
                      images will be deleted too.
                    </p>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Delete from
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2.5 flex-1 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-600"
                    checked={deleteFromDatabase}
                    onChange={(e) => setDeleteFromDatabase(e.target.checked)}
                  />
                  Database
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2.5 flex-1 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-600"
                    checked={deleteFromCloudinary}
                    onChange={(e) => setDeleteFromCloudinary(e.target.checked)}
                  />
                  Cloudinary (selfies)
                </label>
              </div>
              {noTargetSelected && (
                <p className="text-xs text-red-600 mt-1.5">Select at least one target</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="destructive"
                disabled={!preview || preview.count === 0 || previewLoading || noTargetSelected}
                onClick={openConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <FaTrash size={14} />
                Delete Records
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FaExclamationTriangle className="text-red-600" size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Confirm permanent deletion</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    You are about to permanently delete{' '}
                    {deleteFromDatabase && (
                      <>
                        <span className="font-semibold text-gray-800">{preview?.count}</span>{' '}
                        attendance record{preview?.count === 1 ? '' : 's'} from the database
                      </>
                    )}
                    {deleteFromDatabase && deleteFromCloudinary && ' and '}
                    {deleteFromCloudinary && (
                      <>
                        <span className="font-semibold text-gray-800">{preview?.withSelfies}</span>{' '}
                        selfie{preview?.withSelfies === 1 ? '' : 's'} from Cloudinary
                      </>
                    )}
                    {endDate && endDate !== startDate
                      ? ` for ${startDate} to ${endDate}`
                      : ` for ${startDate}`}
                    . This action cannot be undone.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Type <span className="font-mono text-red-600">{CONFIRMATION_PHRASE}</span> to
                  confirm
                </label>
                <input
                  type="text"
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRMATION_PHRASE}
                  disabled={deleting}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={confirmText !== CONFIRMATION_PHRASE || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Deleting…' : 'Permanently Delete'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={closeConfirm} disabled={deleting}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDeleteAttendance;
