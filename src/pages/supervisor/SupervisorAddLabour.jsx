// src/pages/supervisor/SupervisorAddLabour.jsx  (route: /branch/:branchId/labours/add, mobile)
// Add a labour to the project with the mobile shell. POST /users/register, the auto username and the overtime
// calculation are unchanged.
import React, { useState } from 'react';
import { ROUTES } from '@/lib/routes';
import { getSelectedBranchName } from '@/lib/branchContext';
import { getToken } from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import { USERS_KEY } from '@/hooks/useUsers';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '@/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import MobilePage from '@/layouts/mobile/MobilePage';
import LabourFormFields from './components/LabourFormFields';

const SupervisorAddLabour = () => {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const token = getToken();
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('');

  React.useEffect(() => {
    const storedBranchName = getSelectedBranchName();
    if (storedBranchName) {
      setProjectName(storedBranchName);
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    labourType: '',
    wageType: 'daily',
    workingHours: '8',
    dailyWage: '',
    overtimeWage: '',
    username: '',
    mobileNumber: '',
    emergencyContact: ''
  });

  // Auto-calculate overtime rate when dailyWage or workingHours changes
  React.useEffect(() => {
    const dailyWage = parseFloat(formData.dailyWage);
    const workingHours = parseFloat(formData.workingHours);
    
    // Only auto-calculate if both values are valid and workingHours is not zero
    if (dailyWage && workingHours && workingHours > 0) {
      const calculatedOvertimeRate = (dailyWage / workingHours).toFixed(2);
      
      // Only update if different from current value to avoid infinite loops
      if (formData.overtimeWage !== calculatedOvertimeRate) {
        setFormData(prev => ({
          ...prev,
          overtimeWage: calculatedOvertimeRate
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the listed values change (the callbacks are recreated every render)
  }, [formData.dailyWage, formData.workingHours]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.labourType) {
      toast.error('1 field needs fixing', { description: 'Add the name and the labour type.' });
      return;
    }

    try {
      setLoading(true);
      
      // Generate username from name if not provided
      const username = formData.username || 
        formData.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);

      const payload = {
        name: formData.name,
        username: username,
        password: 'default123', // Default password
        role: 'labour',
        jobTitle: formData.labourType,
        mobileNumber: formData.mobileNumber,
        emergencyContact: formData.emergencyContact,
        assignedBranches: [branchId],
        // Store wage details in appropriate fields
        ctcAmount: formData.dailyWage ? parseFloat(formData.dailyWage) : 0,
        salaryType: formData.wageType,
        standardDailyHours: formData.workingHours ? parseFloat(formData.workingHours) : 8,
        overtimeRateMultiplier: formData.overtimeWage ? parseFloat(formData.overtimeWage) : 0
      };

      await axios.post('/users/register', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });

      toast.success('Labour added', { description: `${formData.name} \u00b7 ${projectName || 'this project'}` });
      navigate(ROUTES.branch.labours(branchId));
    } catch (err) {
      console.error('Failed to add labour:', err);
      toast.error('Couldn\u2019t add the labour', { description: err.response?.data?.message || 'Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <MobilePage
        title="Add labour"
        back
        onBack={() => navigate(ROUTES.branch.labours(branchId))}
        footer={
          <Button type="submit" size="xl" className="w-full" disabled={loading}>
            {loading ? 'Adding…' : 'Add labour'}
          </Button>
        }
      >
        <p className="-mb-1 text-small text-ink-3">Project: {projectName || '...'}</p>
        <LabourFormFields formData={formData} onChange={handleChange} disabled={loading} />
      </MobilePage>
    </form>
  );
};

export default SupervisorAddLabour;
