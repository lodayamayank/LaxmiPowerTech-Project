// src/pages/attendance/components/useDeleteAttendance.js
// State, delete-preview request and bulk-delete handler of the Delete records page (moved unchanged from AdminDeleteAttendance.jsx).
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from '@/api/client';

// Kept in sync with the same literal on the backend
// (laxmipowertech-backend/routes/attendance.routes.js).
export const CONFIRMATION_PHRASE = 'DELETE ATTENDANCE RECORDS';

export const todayStr = () => new Date().toISOString().split('T')[0];

export default function useDeleteAttendance() {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // 'cloudinary' = Cloudinary selfies only, kept records get selfieUrl cleared.
  // 'both' = Cloudinary selfies + the attendance records themselves.
  const [deleteMode, setDeleteMode] = useState('both');
  const deleteFromCloudinary = true;
  const deleteFromDatabase = deleteMode === 'both';

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

  const openConfirm = () => {
    if (!preview || preview.count === 0) return;
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
        toast.warning(`${res.data.cloudinaryFailed} selfie(s) could not be removed from Cloudinary`);
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
  return {
    startDate, setStartDate, endDate, setEndDate, preview, previewLoading, previewError, deleteMode, setDeleteMode,
    deleteFromCloudinary, deleteFromDatabase, confirmOpen, confirmText, setConfirmText, deleting, openConfirm, closeConfirm, handleDelete,
  };
}
