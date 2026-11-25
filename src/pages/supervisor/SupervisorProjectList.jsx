// src/pages/supervisor/SupervisorProjectList.jsx  (mobile: the Projects tab)
// The supervisor's assigned projects (branches) with search. Tapping a project opens its hub; "Documents" resolves the
// project on tap. The branch list and requests are unchanged.
import React, { useState, useEffect } from 'react';
import { setSelectedBranch, getUser, setSelectedBranchName } from '@/lib/session';
import { fetchBranchesCached } from '@/hooks/useBranches';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from '@/api/client';
import { ChevronRight, FileText, FolderKanban, MapPinned } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { IconTile } from '@/components/common/IconTile';
import { PageLoader } from '@/components/common/PageLoader';
import { SearchInput } from '@/components/common/SearchInput';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';
import { ROUTES } from '@/lib/routes';

const SupervisorProjectList = () => {
  const user = getUser();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [openingDocsFor, setOpeningDocsFor] = useState(null);

  useEffect(() => {
    fetchAssignedProjects();
  }, []);

  const fetchAssignedProjects = async () => {
    try {
      setLoading(true);
      const res = { data: await fetchBranchesCached() };
      
      // Filter branches based on user's assignedBranches array
      // User model has an 'assignedBranches' field that stores array of branch IDs
      let assignedBranches = [];

      if (user.assignedBranches && user.assignedBranches.length > 0) {
        // Extract branch IDs from user.assignedBranches (handle both object and string formats)
        const assignedBranchIds = user.assignedBranches.map((branch) =>
          typeof branch === "object" ? branch._id : branch,
        );

        // Filter branches to show only assigned ones
        assignedBranches = res.data.filter((branch) =>
          assignedBranchIds.includes(branch._id),
        );
      }

      // Only show assigned branches, never show all branches
      setProjects(assignedBranches);
    } catch (err) {
      console.error("Failed to fetch branches", err);
      // If API fails, show empty list
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (branchId, branchName) => {
    // Store selected branch context in localStorage for material data isolation
    setSelectedBranch({ id: branchId, name: branchName });
    
    // Navigate to Labour dashboard for this specific branch
    navigate(ROUTES.branch.labourDashboard(branchId));
  };

  // Resolve the branch's project only when the button is tapped, instead of
  // downloading every project on page load.
  const handleOpenDocuments = async (branchId, branchName) => {
    setOpeningDocsFor(branchId);
    try {
      const res = await axios.get(`/documents/project-for-branch/${branchId}`);
      setSelectedBranchName(branchName || "Selected Branch");
      navigate(`/supervisor/project/${res.data.projectId}/documents`);
    } catch (err) {
      toast.error("Couldn’t open documents", {
        description: err?.response?.data?.message || "Check your connection and try again.",
        action: { label: "Retry", onClick: () => handleOpenDocuments(branchId, branchName) },
      });
    } finally {
      setOpeningDocsFor(null);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) return <PageLoader label="Loading projects" />;

  return (
    <MobilePage title="Projects" back onBack={() => navigate(ROUTES.dashboard)} tabs="manager">
      <SearchInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClear={() => setSearchTerm("")} placeholder="Search projects..." label="Search projects" />

      {filteredProjects.length === 0 ? (
        <MobileCard>
          <EmptyState icon={FolderKanban} title="No projects found" description={searchTerm ? "Try a different search term." : "No sites are assigned to you yet."} />
        </MobileCard>
      ) : (
        filteredProjects.map((project, index) => (
          <MobileCard key={project._id || index} className="!p-0 overflow-hidden">
            <Button type="button" variant="ghost" className="!h-auto w-full justify-start gap-3 rounded-none p-4 font-normal" onClick={() => handleProjectClick(project._id, project.name)}>
              <IconTile icon={MapPinned} tone="highlight" className="size-10" />
              <span className="flex-1 text-left">
                <span className="block text-[14.5px] font-semibold text-ink-1">{project.name || "Unnamed project"}</span>
                <span className="text-small text-ink-3">{project.location || "No location specified"}</span>
                {project.status ? (
                  <span className="mt-1 block">
                    <Badge variant={project.status === "active" ? "ok" : "neutral"} className="capitalize">
                      {project.status}
                    </Badge>
                  </span>
                ) : null}
              </span>
              <ChevronRight className="text-ink-4" />
            </Button>
            {/* Documents shortcut: looks up the project on tap */}
            <Button type="button" variant="ghost" className="w-full rounded-none border-t border-line text-small text-primary" disabled={openingDocsFor === project._id} onClick={() => handleOpenDocuments(project._id, project.name)}>
              <FileText /> {openingDocsFor === project._id ? "Opening…" : "Documents"}
            </Button>
          </MobileCard>
        ))
      )}
    </MobilePage>
  );
};

export default SupervisorProjectList;
