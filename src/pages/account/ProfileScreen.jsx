// src/pages/account/ProfileScreen.jsx  (mobile: the Profile tab)
// Laid out like the Profile design: identity card, my sites, details (editable), settings rows and Log out.
// The profile (GET/PUT /users/me) and password (PATCH /users/me/password) requests are unchanged.
import React, { useEffect, useState } from 'react';
import { ROLES } from '@/lib/constants';
import { clearSession, getToken, getUser } from '@/lib/session';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { queryClient } from '@/lib/queryClient';
import { USERS_KEY } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import axios from '@/api/client';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, LogOut, MapPin, RefreshCw, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/common/FormField';
import { PageLoader } from '@/components/common/PageLoader';
import { UserAvatar } from '@/components/common/UserAvatar';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';
import { getRoleTone } from '@/lib/status';

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { data: branches } = useBranches();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    jobTitle: '',
    project: '',
    role: '',
    assignedBranches: [],
  });

  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const canChangePassword = [ROLES.supervisor, ROLES.labour].includes(formData.role);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/users/me', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      const {
        name = '',
        email = '',
        mobileNumber = '',
        jobTitle = '',
        project = '',
        role = '',
        assignedBranches = [],
      } = res.data;

      setFormData({
        name,
        email,
        mobileNumber,
        jobTitle,
        project: project?._id || '',
        role,
        assignedBranches: assignedBranches.filter(Boolean),
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to load user', err);
      toast.error('Couldn\u2019t load your profile', { description: 'Check your connection and try again.', action: { label: 'Retry', onClick: () => fetchUser() } });
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        jobTitle: formData.jobTitle,
      };

      await axios.put('/users/me', payload, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success('Profile updated');
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      toast.error('Couldn\u2019t update your profile', { description: 'Check your connection and try again.', action: { label: 'Retry', onClick: () => handleSubmit() } });
      console.error(err);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Fill in all password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password too short', { description: 'Use at least 6 characters.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords don\u2019t match', { description: 'Type the new password again to confirm.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await axios.patch('/users/me/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      toast.success('Password updated');
      setPasswordOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswords({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    } catch (err) {
      toast.error('Couldn\u2019t update the password', { description: err.response?.data?.message || 'Check your current password and try again.' });
      console.error(err);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading your profile" />;

  const handleLogout = () => {
    clearSession();
    navigate(ROUTES.login, { replace: true });
  };
  const username = getUser()?.username;
  const sites = (formData.assignedBranches || [])
    .map((b) => (typeof b === 'string' ? branches.find((br) => String(br._id) === b) : b))
    .filter(Boolean);
  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });
  const passwordField = (field, label) => (
    <FormField label={label} htmlFor={`pw-${field}`}>
      <div className="relative">
        <Input
          id={`pw-${field}`}
          type={showPasswords[field] ? 'text' : 'password'}
          className="pr-11"
          value={passwordData[field]}
          onChange={(e) => setPasswordData((prev) => ({ ...prev, [field]: e.target.value }))}
          autoComplete="new-password"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-control-sm w-control-sm -translate-y-1/2 text-ink-3"
          aria-label={showPasswords[field] ? `Hide ${label}` : `Show ${label}`}
          onClick={() => setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))}
        >
          {showPasswords[field] ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </FormField>
  );

  return (
    <MobilePage title="Profile" back onBack={() => navigate(-1)} tabs={isFieldRole(formData.role) ? 'manager' : 'worker'}>
      <MobileCard className="flex items-center gap-3.5">
        <UserAvatar name={formData.name || 'U'} tone="purple" className="size-14 text-[20px]" />
        <div className="flex-1">
          <div className="text-[18px] font-semibold text-ink-1">{formData.name || 'Your name'}</div>
          {username ? <div className="text-small text-ink-3">@{username}</div> : null}
          <div className="mt-1.5">
            <Badge variant={getRoleTone(formData.role)} className="capitalize">
              {formData.role || 'member'}
            </Badge>
          </div>
        </div>
      </MobileCard>

      <MobileCard title="My sites">
        {sites.length > 0 ? (
          <ul>
            {sites.map((branch) => (
              <li key={branch._id} className="flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
                <MapPin className="size-[18px] text-highlight" />
                <span className="text-[14.5px] text-ink-1">{branch.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-ink-3">No sites assigned yet.</p>
        )}
      </MobileCard>

      <MobileCard title="Details" className="flex flex-col gap-3.5">
        <FormField label="Full name" htmlFor="profile-name">
          <Input id="profile-name" placeholder="Enter your name" value={formData.name || ''} onChange={set('name')} />
        </FormField>
        <FormField label="Mobile" htmlFor="profile-mobile">
          <Input id="profile-mobile" type="tel" placeholder="+91 XXXXX XXXXX" value={formData.mobileNumber || ''} onChange={set('mobileNumber')} />
        </FormField>
        <FormField label="Email" htmlFor="profile-email">
          <Input id="profile-email" type="email" placeholder="your@email.com" value={formData.email || ''} onChange={set('email')} />
        </FormField>
        <FormField label="Job title" htmlFor="profile-job" hint="Your role cannot be changed here.">
          <Input id="profile-job" placeholder="e.g., Electrician" value={formData.jobTitle || ''} onChange={set('jobTitle')} />
        </FormField>
        <Button size="xl" onClick={handleSubmit}>
          Save profile
        </Button>
      </MobileCard>

      <MobileCard className="!py-1">
        {canChangePassword ? (
          <Button type="button" variant="ghost" className="!h-auto w-full justify-start gap-3 rounded-none border-b border-line px-0 py-3.5 font-medium" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="text-ink-3" />
            <span className="flex-1 text-left text-[14.5px] text-ink-1">Change password</span>
            <ChevronRight className="text-ink-4" />
          </Button>
        ) : null}
        <Link to={ROUTES.connectServer} className="flex items-center gap-3 py-3.5 text-ink-1">
          <RefreshCw className="size-4 text-ink-3" />
          <span className="flex-1 text-[14.5px] font-medium">Offline &amp; sync</span>
          <ChevronRight className="size-4 text-ink-4" />
        </Link>
      </MobileCard>

      <Button size="xl" variant="outline" className="w-full border-tone-bad-border text-tone-bad-fg" onClick={handleLogout}>
        <LogOut /> Log out
      </Button>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Your password is stored securely. Admin can set a new one but cannot view your current password.</DialogDescription>
          </DialogHeader>
          {passwordField('currentPassword', 'Current password')}
          {passwordField('newPassword', 'New password')}
          {passwordField('confirmPassword', 'Confirm new password')}
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handlePasswordSubmit} disabled={passwordSaving}>
              {passwordSaving ? 'Updating…' : 'Update password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobilePage>
  );
};

export default ProfileScreen;
