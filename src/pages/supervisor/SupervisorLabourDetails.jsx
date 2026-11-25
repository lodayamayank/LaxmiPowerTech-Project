// src/pages/supervisor/SupervisorLabourDetails.jsx  (route: /branch/:branchId/labours/:labourId, mobile)
// Edit one labour with the mobile shell. GET/PUT/DELETE /users/:id and the validation are unchanged; the delete
// confirmation is a ConfirmDialog instead of window.confirm.
import React, { useState, useEffect } from "react";
import { ROUTES } from '@/lib/routes';
import { getSelectedBranchName } from '@/lib/branchContext';
import { getToken } from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import { USERS_KEY } from '@/hooks/useUsers';
import { useNavigate, useParams } from "react-router-dom";
import axios from "@/api/client";
import { Trash2 } from "lucide-react";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageLoader } from "@/components/common/PageLoader";
import MobilePage from "@/layouts/mobile/MobilePage";
import LabourFormFields from "./components/LabourFormFields";

const SupervisorLabourDetails = () => {
  const navigate = useNavigate();
  const { branchId, labourId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [projectName, setProjectName] = useState("");
  const token = getToken();

  const [formData, setFormData] = useState({
    name: "",
    labourType: "",
    wageType: "daily",
    workingHours: "8",
    dailyWage: "",
    overtimeWage: "",
    username: "",
    mobileNumber: "",
    emergencyContact: "",
  });

  useEffect(() => {
    const storedBranchName = getSelectedBranchName();
    if (storedBranchName) {
      setProjectName(storedBranchName);
    }
    fetchLabourDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  }, [labourId]);

  const fetchLabourDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/users/${labourId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const labour = res.data;
      setFormData({
        name: labour.name || "",
        labourType: labour.jobTitle || "",
        wageType: labour.salaryType || "daily",
        workingHours: labour.standardDailyHours?.toString() || "8",
        dailyWage: labour.ctcAmount?.toString() || "",
        overtimeWage: labour.overtimeRateMultiplier?.toString() || "",
        username: labour.username || "",
        mobileNumber: labour.mobileNumber || "",
        emergencyContact: labour.emergencyContact || "",
      });
    } catch (err) {
      console.error("Failed to fetch labour details:", err);
      toast.error("Couldn\u2019t load the labour", { description: "Check your connection and try again." });
      navigate(ROUTES.branch.labours(branchId));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.labourType) {
      toast.error("1 field needs fixing", { description: "Add the name and the labour type." });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name,
        username: formData.username,
        jobTitle: formData.labourType,
        mobileNumber: formData.mobileNumber,
        emergencyContact: formData.emergencyContact,
        ctcAmount: formData.dailyWage ? parseFloat(formData.dailyWage) : 0,
        salaryType: formData.wageType,
        standardDailyHours: formData.workingHours
          ? parseFloat(formData.workingHours)
          : 8,
        overtimeRateMultiplier: formData.overtimeWage
          ? parseFloat(formData.overtimeWage)
          : 0,
      };

      await axios.put(`/users/${labourId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });

      toast.success("Labour updated");
      navigate(ROUTES.branch.labours(branchId));
    } catch (err) {
      console.error("Failed to update labour:", err);
      toast.error("Couldn\u2019t update the labour", { description: err.response?.data?.message || "Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await axios.delete(`/users/${labourId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("Labour deleted");
      navigate(ROUTES.branch.labours(branchId));
    } catch (err) {
      console.error("Failed to delete labour:", err);
      toast.error("Couldn\u2019t delete the labour", { description: "Check your connection and try again.", action: { label: "Retry", onClick: () => handleDelete() } });
    }
  };

  if (loading) return <PageLoader label="Loading labour" />;

  return (
    <>
      <form onSubmit={handleSubmit}>
        <MobilePage
          title={formData.name || "Labour"}
          back
          onBack={() => navigate(ROUTES.branch.labours(branchId))}
          right={
            <Button type="button" variant="ghost" size="icon" aria-label="Delete labour" className="text-tone-bad-fg" onClick={() => setConfirmDelete(true)} disabled={saving}>
              <Trash2 />
            </Button>
          }
          footer={
            <Button type="submit" size="xl" className="w-full" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          }
        >
          <p className="-mb-1 text-small text-ink-3">Project: {projectName || "..."}</p>
          <LabourFormFields formData={formData} onChange={handleChange} disabled={saving} />
        </MobilePage>
      </form>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this labour?"
        description={`Are you sure you want to delete ${formData.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
};
export default SupervisorLabourDetails;
