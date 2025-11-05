import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { projectsAPI, proposalsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SkeletonCard from '../components/ui/SkeletonCard';

const MyProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const { user, isClient } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!isClient) {
      navigate('/');
      return;
    }
    fetchProjects();
  }, [isClient, navigate]);

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      // Get all projects and filter by client_id
      const response = await projectsAPI.getAll();
      const clientProjects = response.data.data.filter((p) => p.client_id === user.profile.id);
      setProjects(clientProjects);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async (projectId) => {
    try {
      const response = await proposalsAPI.getAll({ project_id: projectId });
      setProposals(response.data.data);
    } catch (err) {
      console.error('Failed to load proposals:', err);
    }
  };

  const handleViewProposals = (project) => {
    setSelectedProject(project);
    setFilterStatus('all');
    fetchProposals(project.id);
  };

  const handleAcceptProposal = async (proposalId) => {
    const confirmed = await confirm({
      title: 'Accept Proposal',
      message: 'Are you sure you want to accept this proposal? This will reject all other proposals, mark the project as awarded, and create a contract.',
      confirmText: 'Accept',
      variant: 'success'
    });

    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [proposalId]: true }));
    try {
      const response = await proposalsAPI.accept(proposalId);
      const { contract } = response.data.data;

      toast.success('Proposal accepted successfully! Contract has been created.');

      fetchProposals(selectedProject.id);
      fetchProjects();

      // Ask if they want to view the contract
      const viewContract = await confirm({
        title: 'View Contract',
        message: 'Would you like to view the contract now?',
        confirmText: 'View Contract',
        variant: 'primary'
      });

      if (viewContract) {
        navigate(`/contracts/${contract.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept proposal');
      console.error(err);
    } finally {
      setActionLoading(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleRejectProposal = async (proposalId) => {
    const confirmed = await confirm({
      title: 'Reject Proposal',
      message: 'Are you sure you want to reject this proposal?',
      confirmText: 'Reject',
      variant: 'danger'
    });

    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [`reject-${proposalId}`]: true }));
    try {
      await proposalsAPI.reject(proposalId);
      toast.success('Proposal rejected successfully!');
      fetchProposals(selectedProject.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject proposal');
      console.error(err);
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${proposalId}`]: false }));
    }
  };

  const handleShortlistProposal = async (proposalId) => {
    setActionLoading(prev => ({ ...prev, [`shortlist-${proposalId}`]: true }));
    try {
      await proposalsAPI.update(proposalId, { status: 'shortlisted' });
      toast.success('Proposal shortlisted!');
      fetchProposals(selectedProject.id);
    } catch (err) {
      toast.error('Failed to shortlist proposal');
      console.error(err);
    } finally {
      setActionLoading(prev => ({ ...prev, [`shortlist-${proposalId}`]: false }));
    }
  };

  const handleDeleteProject = async (projectId) => {
    const confirmed = await confirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [`delete-${projectId}`]: true }));
    try {
      await projectsAPI.delete(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      toast.success('Project deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete project');
      console.error(err);
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${projectId}`]: false }));
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h1 style={{ marginBottom: '1.5rem' }}>My Projects</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonCard count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>My Projects</h1>
        <button onClick={() => navigate('/create-project')} className="btn btn-success">
          Create New Project
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button onClick={() => navigate('/create-project')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Create Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {projects.map((project) => (
            <div key={project.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3>{project.title}</h3>
                  <div className={`status-badge status-${project.status}`} style={{ marginTop: '0.5rem' }}>
                    {project.status}
                  </div>
                  <p style={{ marginTop: '1rem', color: '#666' }}>
                    {project.description?.substring(0, 200)}
                    {project.description?.length > 200 && '...'}
                  </p>
                  <div className="project-meta" style={{ marginTop: '1rem' }}>
                    <span>Type: {project.project_type}</span>
                    <span>
                      Budget: ${project.budget_min} - ${project.budget_max}
                    </span>
                    <span>{project.proposal_count} proposals</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Button onClick={() => handleViewProposals(project)} variant="primary">
                    View Proposals ({project.proposal_count})
                  </Button>
                  <Button onClick={() => navigate(`/projects/${project.id}`)} variant="secondary">
                    View Details
                  </Button>
                  {project.status === 'open' && (
                    <Button
                      onClick={() => handleDeleteProject(project.id)}
                      variant="danger"
                      loading={actionLoading[`delete-${project.id}`]}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        title={selectedProject ? `Proposals for "${selectedProject.title}"` : ''}
        maxWidth="800px"
      >
        {selectedProject && (
          <div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setFilterStatus('all')} 
                className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.875rem' }}
              >
                All ({proposals.length})
              </button>
              <button 
                onClick={() => setFilterStatus('submitted')} 
                className={`btn ${filterStatus === 'submitted' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.875rem' }}
              >
                Submitted ({proposals.filter(p => p.status === 'submitted').length})
              </button>
              <button 
                onClick={() => setFilterStatus('shortlisted')} 
                className={`btn ${filterStatus === 'shortlisted' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.875rem' }}
              >
                ⭐ Shortlisted ({proposals.filter(p => p.status === 'shortlisted').length})
              </button>
              <button 
                onClick={() => setFilterStatus('accepted')} 
                className={`btn ${filterStatus === 'accepted' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.875rem' }}
              >
                ✓ Accepted ({proposals.filter(p => p.status === 'accepted').length})
              </button>
              <button 
                onClick={() => setFilterStatus('rejected')} 
                className={`btn ${filterStatus === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.875rem' }}
              >
                ✗ Rejected ({proposals.filter(p => p.status === 'rejected').length})
              </button>
            </div>

            {proposals.filter(p => filterStatus === 'all' || p.status === filterStatus).length === 0 ? (
              <div className="empty-state">
                <p>No {filterStatus !== 'all' ? filterStatus : ''} proposals yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {proposals.filter(p => filterStatus === 'all' || p.status === filterStatus).map((proposal) => (
                  <div key={proposal.id} className="card" style={{ backgroundColor: '#f8f9fa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3>{proposal.freelancer_name}</h3>
                        <div className={`status-badge status-${proposal.status}`} style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {proposal.status === 'shortlisted' && '⭐ '}
                          {proposal.status === 'accepted' && '✓ '}
                          {proposal.status === 'rejected' && '✗ '}
                          {proposal.status}
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                          {proposal.bid_amount && (
                            <p>
                              <strong>Bid Amount:</strong> ${proposal.bid_amount}
                            </p>
                          )}
                          {proposal.hourly_rate && (
                            <p>
                              <strong>Hourly Rate:</strong> ${proposal.hourly_rate}/hr
                            </p>
                          )}
                          {proposal.estimated_hours && (
                            <p>
                              <strong>Estimated Hours:</strong> {proposal.estimated_hours}h
                            </p>
                          )}
                          {proposal.freelancer_rating && (
                            <p>
                              <strong>Rating:</strong> {proposal.freelancer_rating} / 5
                            </p>
                          )}
                        </div>

                        {proposal.cover_letter && (
                          <div style={{ marginTop: '1rem' }}>
                            <strong>Cover Letter:</strong>
                            <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{proposal.cover_letter}</p>
                          </div>
                        )}

                        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
                          Submitted: {new Date(proposal.submitted_at).toLocaleDateString()}
                        </p>
                      </div>

                      {(proposal.status === 'submitted' || proposal.status === 'shortlisted') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '120px' }}>
                          <Button
                            onClick={() => handleAcceptProposal(proposal.id)}
                            variant="success"
                            loading={actionLoading[proposal.id]}
                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                          >
                            ✓ Accept
                          </Button>
                          <Button
                            onClick={() => handleRejectProposal(proposal.id)}
                            variant="danger"
                            loading={actionLoading[`reject-${proposal.id}`]}
                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                          >
                            ✗ Reject
                          </Button>
                          {proposal.status === 'submitted' && (
                            <Button
                              onClick={() => handleShortlistProposal(proposal.id)}
                              variant="secondary"
                              loading={actionLoading[`shortlist-${proposal.id}`]}
                              style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                            >
                              ⭐ Shortlist
                            </Button>
                          )}
                        </div>
                      )}
                      {proposal.status === 'accepted' && (
                        <div style={{ 
                          padding: '0.75rem 1rem', 
                          backgroundColor: '#28a745', 
                          color: 'white',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          ✓ Accepted
                        </div>
                      )}
                      {proposal.status === 'rejected' && (
                        <div style={{ 
                          padding: '0.75rem 1rem', 
                          backgroundColor: '#dc3545', 
                          color: 'white',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          ✗ Rejected
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyProjects;
