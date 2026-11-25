import React, { useEffect, useMemo, useState } from 'react';
import { ROLES } from '@/lib/constants';
import DashboardLayout from '@/layouts/desktop/DashboardLayout';
import axios from '@/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ALL_ROLES = [ROLES.staff, ROLES.supervisor, ROLES.subcontractor, ROLES.labour];

// The three rules, in the order and with the wording the page always had.
const RULES = [
  {
    key: 'holiday',
    label: 'Paid Public Holiday Eligibility',
    description: 'Employees in selected roles will receive full pay on public holidays. Others will have holidays counted as absent.',
  },
  {
    key: 'sunday',
    label: 'Sunday as Working Day (no week-off)',
    description: 'Employees in selected roles will have Sundays treated as regular working days for attendance and salary purposes.',
  },
  {
    key: 'overtime',
    label: 'Overtime Pay Eligibility',
    description: 'Only employees in selected roles will receive overtime compensation. Roles not selected will have overtime hours tracked but no overtime pay added to their salary.',
  },
];

const sameList = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

const SalaryPolicyPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holidayRoles, setHolidayRoles] = useState([]);
  const [sundayExcludedRoles, setSundayExcludedRoles] = useState([]);
  const [overtimeRoles, setOvertimeRoles] = useState([]);
  // Last loaded / saved policy: what Discard returns to and what the "in effect" card shows.
  const [saved, setSaved] = useState({ holiday: [], sunday: [], overtime: [] });

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/salary-policy');
      setHolidayRoles(res.data.holidayPaidLeaveEligibleRoles || []);
      setSundayExcludedRoles(res.data.sundayHolidayExcludedRoles || []);
      setOvertimeRoles(res.data.overtimeEligibleRoles || []);
      setSaved({
        holiday: res.data.holidayPaidLeaveEligibleRoles || [],
        sunday: res.data.sundayHolidayExcludedRoles || [],
        overtime: res.data.overtimeEligibleRoles || [],
      });
    } catch {
      toast.error('Failed to load salary policy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const toggleRole = (role, setList) => {
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
      setSaved({ holiday: holidayRoles, sunday: sundayExcludedRoles, overtime: overtimeRoles });
    } catch {
      toast.error('Failed to save salary policy');
    } finally {
      setSaving(false);
    }
  };

  const current = { holiday: holidayRoles, sunday: sundayExcludedRoles, overtime: overtimeRoles };
  const setters = { holiday: setHolidayRoles, sunday: setSundayExcludedRoles, overtime: setOvertimeRoles };
  const dirty = useMemo(
    () => RULES.some((r) => !sameList(current[r.key], saved[r.key])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holidayRoles, sundayExcludedRoles, overtimeRoles, saved]
  );

  const discard = () => {
    setHolidayRoles(saved.holiday);
    setSundayExcludedRoles(saved.sunday);
    setOvertimeRoles(saved.overtime);
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Payroll / Payroll policy"
        title="Payroll policy"
        description="How holidays, Sundays and overtime are treated in salary."
      />

      <SectionCard
        flush
        title="Rules by role"
        description="Tick the roles each rule applies to"
      >
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5">Rule</TableHead>
                  {ALL_ROLES.map((role) => (
                    <TableHead key={role} className="text-center capitalize">
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {RULES.map((rule) => (
                  <TableRow key={rule.key}>
                    <TableCell className="px-5 py-3.5 align-top">
                      <div className="font-medium text-ink-1">{rule.label}</div>
                      <div className="mt-0.5 max-w-md whitespace-normal text-caption-lg text-ink-3">{rule.description}</div>
                    </TableCell>
                    {ALL_ROLES.map((role) => (
                      <TableCell key={role} className="text-center align-middle">
                        <Checkbox
                          checked={current[rule.key].includes(role)}
                          onCheckedChange={() => toggleRole(role, setters[rule.key])}
                          aria-label={`${rule.label} for ${role}`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line px-4 py-2.5 text-small text-ink-3">
              <span>Changes apply from the next salary recalculation.</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={discard} disabled={!dirty || saving}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? 'Saving...' : 'Save policy'}
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Current policy in effect">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-2 text-small text-ink-2">
            <p>
              Paid holiday eligible: <b className="text-ink-1">{saved.holiday.length > 0 ? saved.holiday.join(', ') : 'None'}</b>
            </p>
            <p>
              Sunday = working day for:{' '}
              <b className="text-ink-1">{saved.sunday.length > 0 ? saved.sunday.join(', ') : 'None (all get Sunday off)'}</b>
            </p>
            <p>
              Overtime pay eligible:{' '}
              <b className="text-ink-1">{saved.overtime.length > 0 ? saved.overtime.join(', ') : 'None (no overtime pay for anyone)'}</b>
            </p>
          </div>
        )}
      </SectionCard>
    </DashboardLayout>
  );
};

export default SalaryPolicyPage;
