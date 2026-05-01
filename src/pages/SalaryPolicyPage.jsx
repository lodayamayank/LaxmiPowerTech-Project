import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import axios from '../utils/axios';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FaShieldAlt, FaSave } from 'react-icons/fa';

const ALL_ROLES = ['staff', 'supervisor', 'subcontractor', 'labour'];

const SalaryPolicyPage = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holidayRoles, setHolidayRoles] = useState([]);
  const [sundayExcludedRoles, setSundayExcludedRoles] = useState([]);
  const [overtimeRoles, setOvertimeRoles] = useState([]);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/salary-policy');
      setPolicy(res.data);
      setHolidayRoles(res.data.holidayPaidLeaveEligibleRoles || []);
      setSundayExcludedRoles(res.data.sundayHolidayExcludedRoles || []);
      setOvertimeRoles(res.data.overtimeEligibleRoles || []);
    } catch (err) {
      toast.error('Failed to load salary policy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const toggleRole = (role, list, setList) => {
    setList((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put('/salary-policy', {
        holidayPaidLeaveEligibleRoles: holidayRoles,
        sundayHolidayExcludedRoles: sundayExcludedRoles,
        overtimeEligibleRoles: overtimeRoles,
      });
      toast.success('Salary policy saved');
    } catch (err) {
      toast.error('Failed to save salary policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Salary Policy">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  const RoleCheckboxGroup = ({ label, description, selectedRoles, onToggle }) => (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-gray-800 dark:text-white">{label}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {ALL_ROLES.map((role) => (
          <label
            key={role}
            className="flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 hover:border-orange-400 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedRoles.includes(role)}
              onChange={() => onToggle(role)}
              className="accent-orange-500 w-4 h-4"
            />
            <span className="capitalize text-sm font-medium text-gray-700 dark:text-gray-300">{role}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Salary Policy">
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaShieldAlt className="text-orange-500" size={22} />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Payroll Policy Configuration</h2>
            </div>

            <div className="space-y-8">
              <RoleCheckboxGroup
                label="Paid Public Holiday Eligibility"
                description="Employees in selected roles will receive full pay on public holidays. Others will have holidays counted as absent."
                selectedRoles={holidayRoles}
                onToggle={(role) => toggleRole(role, holidayRoles, setHolidayRoles)}
              />

              <hr className="border-gray-200 dark:border-gray-700" />

              <RoleCheckboxGroup
                label="Sunday as Working Day (no week-off)"
                description="Employees in selected roles will have Sundays treated as regular working days for attendance and salary purposes."
                selectedRoles={sundayExcludedRoles}
                onToggle={(role) => toggleRole(role, sundayExcludedRoles, setSundayExcludedRoles)}
              />

              <hr className="border-gray-200 dark:border-gray-700" />

              <RoleCheckboxGroup
                label="Overtime Pay Eligibility"
                description="Only employees in selected roles will receive overtime compensation. Roles not selected will have overtime hours tracked but no overtime pay added to their salary."
                selectedRoles={overtimeRoles}
                onToggle={(role) => toggleRole(role, overtimeRoles, setOvertimeRoles)}
              />
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <FaSave />
                {saving ? 'Saving...' : 'Save Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Current Policy Summary</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium">Paid holiday eligible: </span>
                {holidayRoles.length > 0 ? holidayRoles.join(', ') : 'None'}
              </p>
              <p>
                <span className="font-medium">Sunday = working day for: </span>
                {sundayExcludedRoles.length > 0 ? sundayExcludedRoles.join(', ') : 'None (all get Sunday off)'}
              </p>
              <p>
                <span className="font-medium">Overtime pay eligible: </span>
                {overtimeRoles.length > 0 ? overtimeRoles.join(', ') : 'None (no overtime pay for anyone)'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SalaryPolicyPage;
