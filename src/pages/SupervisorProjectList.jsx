import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import logo from '../assets/logo.png';
import { FaSignOutAlt, FaSearch, FaChevronRight, FaArrowLeft } from 'react-icons/fa';
import { MdFolder } from 'react-icons/md';

const SupervisorProjectList = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAssignedProjects();
  }, []);

  const fetchAssignedProjects = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter projects based on user's assigned project field
      // User model has a 'project' field that stores the assigned project ID
      let assignedProjects = [];
      
      if (user.project) {
        // User has an assigned project - filter to show only that project
        const projectId = typeof user.project === 'object' ? user.project._id : user.project;
        assignedProjects = res.data.filter(project => project._id === projectId);
      }
      
      // Only show assigned projects, never show all projects
      setProjects(assignedProjects);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      // If API fails, show empty list
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login', { replace: true });
  };

  const handleProjectClick = (projectId) => {
    // Navigate to Labour dashboard for this specific project
    navigate(`/project/${projectId}/labour-dashboard`);
  };

  const filteredProjects = projects.filter(project =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Logo" className="h-16 w-50 bg-white box-shadow rounded-2xl" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-all duration-300 shadow-lg"
            >
              <FaSignOutAlt size={14} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>

          {/* Title Section */}
          <div className="mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-3 transition-colors"
            >
              <FaArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </button>
            <h2 className="text-white text-2xl font-bold">My Projects</h2>
            <p className="text-white/80 text-sm mt-1">Select a project to view details</p>
          </div>
        </div>

        {/* Search Section */}
        <div className="px-6 py-6 -mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Projects List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MdFolder className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Projects Found</h3>
              <p className="text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No projects assigned to you yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project, index) => (
                <div
                  key={project._id || index}
                  onClick={() => handleProjectClick(project._id)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-md">
                        <MdFolder className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-sm mb-0.5">
                          {project.name || 'Unnamed Project'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {project.location || 'No location specified'}
                        </p>
                        {project.status && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {project.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <FaChevronRight 
                      className="text-gray-400 group-hover:text-orange-500 transition-colors" 
                      size={16} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Powered by Laxmi Power Tech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorProjectList;
