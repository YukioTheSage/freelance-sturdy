import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, proposalsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({
    bid_amount: '',
    hourly_rate: '',
    estimated_hours: '',
    cover_letter: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const { user, isFreelancer } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await projectsAPI.getById(id);
      setProject(response.data.data);
    } catch (err) {
      setError('Failed to load project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProposalChange = (e) => {
    setProposalData({
      ...proposalData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const data = {
        project_id: id,
        bid_amount: proposalData.bid_amount ? parseFloat(proposalData.bid_amount) : null,
        hourly_rate: proposalData.hourly_rate ? parseFloat(proposalData.hourly_rate) : null,
        estimated_hours: proposalData.estimated_hours ? parseInt(proposalData.estimated_hours) : null,
        cover_letter: proposalData.cover_letter,
      };

      await proposalsAPI.create(data);
      setSuccess('Proposal submitted successfully!');
      setShowProposalForm(false);
      setProposalData({
        bid_amount: '',
        hourly_rate: '',
        estimated_hours: '',
        cover_letter: '',
      });
      // Refresh project to update proposal count
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="error-message">Project not found</div>
      </div>
    );
  }

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
        Back
      </button>

      <div className="card">
        <h1 style={{ marginBottom: '1rem' }}>{project.title}</h1>
        <div className={`status-badge status-${project.status}`} style={{ marginBottom: '1rem' }}>
          {project.status}
        </div>
        <div className="project-type">{project.project_type}</div>

        <div style={{ marginTop: '1.5rem' }}>
          <h3>Description</h3>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{project.description}</p>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <h3>Budget</h3>
          <p style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            ${project.budget_min} - ${project.budget_max} {project.currency}
          </p>
        </div>

        {project.due_at && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Due Date</h3>
            <p style={{ marginTop: '0.5rem' }}>{new Date(project.due_at).toLocaleDateString()}</p>
          </div>
        )}

        {project.skills && project.skills.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Required Skills</h3>
            <div className="skills-list" style={{ marginTop: '0.5rem' }}>
              {project.skills.map((skill) => (
                <span key={skill.id} className="skill-tag">
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <h3>Client Information</h3>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>Company:</strong> {project.company_name}
            <br />
            <strong>Contact:</strong> {project.client_name}
            <br />
            <strong>Location:</strong> {project.client_country}
          </p>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <p>
            <strong>{project.proposal_count}</strong> proposal(s) submitted
          </p>
        </div>

        {isFreelancer && project.status === 'open' && (
          <div style={{ marginTop: '1.5rem' }}>
            {!showProposalForm ? (
              <button onClick={() => setShowProposalForm(true)} className="btn btn-success">
                Submit Proposal
              </button>
            ) : (
              <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
                <h3>Submit Your Proposal</h3>
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}
                <form onSubmit={handleSubmitProposal}>
                  {project.project_type === 'fixed' ? (
                    <div className="form-group">
                      <label htmlFor="bid_amount">Bid Amount ($)</label>
                      <input
                        type="number"
                        id="bid_amount"
                        name="bid_amount"
                        value={proposalData.bid_amount}
                        onChange={handleProposalChange}
                        required
                        min="0"
                        step="0.01"
                        placeholder="Enter your bid amount"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label htmlFor="hourly_rate">Hourly Rate ($)</label>
                        <input
                          type="number"
                          id="hourly_rate"
                          name="hourly_rate"
                          value={proposalData.hourly_rate}
                          onChange={handleProposalChange}
                          required
                          min="0"
                          step="0.01"
                          placeholder="Your hourly rate"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="estimated_hours">Estimated Hours</label>
                        <input
                          type="number"
                          id="estimated_hours"
                          name="estimated_hours"
                          value={proposalData.estimated_hours}
                          onChange={handleProposalChange}
                          required
                          min="1"
                          placeholder="Estimated hours to complete"
                        />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label htmlFor="cover_letter">Cover Letter</label>
                    <textarea
                      id="cover_letter"
                      name="cover_letter"
                      value={proposalData.cover_letter}
                      onChange={handleProposalChange}
                      required
                      placeholder="Explain why you're the best fit for this project..."
                      rows="6"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="btn btn-success" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Proposal'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowProposalForm(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
