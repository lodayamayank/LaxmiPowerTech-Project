import { getUser } from '@/lib/session';

export default function useCurrentUser() {
  const user = getUser();
  const project = user?.project && typeof user.project === 'object' ? user.project._id : user?.project;
  const role = user?.role || null;
  return {
    id: user?._id || user?.id || null,
    name: user?.name || '',
    role,
    project: project || null,
    isAdmin: role === 'admin',
    // Mirrors DOCUMENT_ALLOWED_ROLES on the server (labour is excluded).
    canUseDocuments: ['admin', 'staff', 'supervisor', 'subcontractor'].includes(role),
  };
}
