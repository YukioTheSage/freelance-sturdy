import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SkeletonCard from '../components/ui/SkeletonCard';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    project_type: '',
  });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProjects();
  }, [filters, isAuthenticated, navigate]);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.project_type) params.project_type = filters.project_type;

      const response = await projectsAPI.getAll(params);
      setProjects(response.data.data);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="container">
        <h1 style={{ marginBottom: '1.5rem' }}>Browse Projects</h1>
        <div className="filters">
          <div className="filters-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Status</label>
              <select disabled>
                <option>All Statuses</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Project Type</label>
              <select disabled>
                <option>All Types</option>
              </select>
            </div>
          </div>
        </div>
        <div className="projects-grid">
          <SkeletonCard count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '1.5rem' }}>Browse Projects</h1>

      <div className="filters">
        <div className="filters-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="project_type">Project Type</label>
            <select id="project_type" name="project_type" value={filters.project_type} onChange={handleFilterChange}>
              <option value="">All Types</option>
              <option value="fixed">Fixed Price</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects found</h3>
          <p>Check back later for new opportunities</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project.id} className="project-card" onClick={() => handleProjectClick(project.id)}>
              <h3>{project.title}</h3>
              <div className={`status-badge status-${project.status}`}>{project.status}</div>
              <p style={{ marginTop: '0.5rem', color: '#666' }}>
                {project.description?.substring(0, 150)}
                {project.description?.length > 150 && '...'}
              </p>
              <div className="project-type">{project.project_type}</div>
              <div className="project-meta">
                <span>
                  Budget: ${project.budget_min} - ${project.budget_max}
                </span>
                <span>{project.proposal_count} proposals</span>
              </div>
              {project.skills && project.skills.length > 0 && (
                <div className="skills-list">
                  {project.skills.map((skill) => (
                    <span key={skill.id} className="skill-tag">
                      {skill.name}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                Posted by: {project.client_name || project.company_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
