import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateProject = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: 'fixed',
    budget_min: '',
    budget_max: '',
    currency: 'USD',
    due_at: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isClient } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isClient) {
      navigate('/');
    }
  }, [isClient, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const projectData = {
        title: formData.title,
        description: formData.description,
        project_type: formData.project_type,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
        currency: formData.currency,
        due_at: formData.due_at || null,
      };

      const response = await projectsAPI.create(projectData);
      navigate(`/projects/${response.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
        Back
      </button>

      <div className="card">
        <h1 style={{ marginBottom: '1.5rem' }}>Create New Project</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Project Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Build a responsive website"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="6"
              placeholder="Describe your project in detail..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="project_type">Project Type *</label>
            <select id="project_type" name="project_type" value={formData.project_type} onChange={handleChange} required>
              <option value="fixed">Fixed Price</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="budget_min">Minimum Budget ($)</label>
              <input
                type="number"
                id="budget_min"
                name="budget_min"
                value={formData.budget_min}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="500"
              />
            </div>

            <div className="form-group">
              <label htmlFor="budget_max">Maximum Budget ($)</label>
              <input
                type="number"
                id="budget_max"
                name="budget_max"
                value={formData.budget_max}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="2000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <select id="currency" name="currency" value={formData.currency} onChange={handleChange}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="due_at">Due Date (optional)</label>
            <input
              type="date"
              id="due_at"
              name="due_at"
              value={formData.due_at}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
