// src/pages/dev/ShellPreview.jsx
// Dev-only preview of the desktop shell (works without a login: no user, so no polling).
import DashboardLayout from '@/layouts/desktop/DashboardLayout';
import { SectionCard } from '@/components/common/SectionCard';
import { PageHeader } from '@/components/common/PageHeader';

export default function ShellPreview() {
  return (
    <DashboardLayout title="Shell preview">
      <PageHeader eyebrow="Dev" title="Desktop shell" description="Sidebar, top bar and content width." />
      <SectionCard title="Content" description="Max width 1240px, page background, 32px side padding on md and up.">
        <p className="text-body text-ink-2">Resize the window to check the mobile sidebar trigger and the collapse button.</p>
      </SectionCard>
    </DashboardLayout>
  );
}
