import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contractsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ContractDetail = () => {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await contractsAPI.getById(id);
      setContract(response.data.data);
    } catch (err) {
      setError('Failed to load contract details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteContract = async () => {
    if (!window.confirm('Are you sure you want to mark this contract as completed?')) {
      return;
    }

    try {
      await contractsAPI.update(id, { status: 'completed', end_at: new Date().toISOString() });
      alert('Contract marked as completed!');
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update contract');
    }
  };

  const handleTerminateContract = async () => {
    if (!window.confirm('Are you sure you want to terminate this contract? This action cannot be undone.')) {
      return;
    }

    try {
      await contractsAPI.update(id, { status: 'terminated', end_at: new Date().toISOString() });
      alert('Contract terminated');
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to terminate contract');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading contract...</div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="container">
        <div className="error-message">{error || 'Contract not found'}</div>
        <button onClick={() => navigate('/contracts')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Contracts
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      active: '#28a745',
      completed: '#007bff',
      terminated: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className="container">
      <button onClick={() => navigate('/contracts')} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
        ← Back to Contracts
      </button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>{contract.project_title}</h1>
            <div
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: getStatusColor(contract.status),
                color: 'white',
              }}
            >
              {contract.status.toUpperCase()}
            </div>
          </div>

          {contract.status === 'active' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleCompleteContract} className="btn btn-success">
                Mark Complete
              </button>
              <button onClick={handleTerminateContract} className="btn btn-danger">
                Terminate
              </button>
            </div>
          )}
        </div>

        {/* Contract Details */}
        <div style={{ marginTop: '2rem' }}>
          <h3>Contract Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <strong>Contract Type:</strong>
              <p style={{ marginTop: '0.25rem', fontSize: '1.1rem' }}>
                {contract.contract_type === 'fixed' ? 'Fixed Price' : 'Hourly Rate'}
              </p>
            </div>
            
            {contract.contract_type === 'fixed' && contract.agreed_amount && (
              <div>
                <strong>Agreed Amount:</strong>
                <p style={{ marginTop: '0.25rem', fontSize: '1.1rem', color: '#28a745', fontWeight: 'bold' }}>
                  ${contract.agreed_amount} {contract.currency}
                </p>
              </div>
            )}
            
            {contract.contract_type === 'hourly' && contract.hourly_rate && (
              <div>
                <strong>Hourly Rate:</strong>
                <p style={{ marginTop: '0.25rem', fontSize: '1.1rem', color: '#28a745', fontWeight: 'bold' }}>
                  ${contract.hourly_rate}/hour
                </p>
              </div>
            )}

            <div>
              <strong>Start Date:</strong>
              <p style={{ marginTop: '0.25rem' }}>{new Date(contract.start_at).toLocaleDateString()}</p>
            </div>

            {contract.end_at && (
              <div>
                <strong>End Date:</strong>
                <p style={{ marginTop: '0.25rem' }}>{new Date(contract.end_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Parties */}
        <div style={{ marginTop: '2rem' }}>
          <h3>Parties</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
              <h4>Client</h4>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>Name:</strong> {contract.client_name}
              </p>
              {contract.company_name && (
                <p>
                  <strong>Company:</strong> {contract.company_name}
                </p>
              )}
              <p>
                <strong>Email:</strong> {contract.client_email}
              </p>
            </div>

            <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
              <h4>Freelancer</h4>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>Name:</strong> {contract.freelancer_name}
              </p>
              <p>
                <strong>Email:</strong> {contract.freelancer_email}
              </p>
              {contract.freelancer_rating && (
                <p>
                  <strong>Rating:</strong> {contract.freelancer_rating}/5 ⭐
                </p>
              )}
              {contract.freelancer_bio && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                  {contract.freelancer_bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Project Description */}
        {contract.project_description && (
          <div style={{ marginTop: '2rem' }}>
            <h3>Project Description</h3>
            <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {contract.project_description}
            </p>
          </div>
        )}

        {/* Milestones */}
        {contract.milestones && contract.milestones.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>Milestones ({contract.milestones.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {contract.milestones.map((milestone) => (
                <div key={milestone.id} className="card" style={{ backgroundColor: '#f8f9fa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h4>{milestone.title}</h4>
                      <div className={`status-badge status-${milestone.status}`} style={{ marginTop: '0.5rem' }}>
                        {milestone.status}
                      </div>
                      {milestone.scope && (
                        <p style={{ marginTop: '0.75rem', color: '#666' }}>{milestone.scope}</p>
                      )}
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {milestone.amount > 0 && (
                          <div>
                            <strong>Amount:</strong> ${milestone.amount}
                          </div>
                        )}
                        {milestone.due_at && (
                          <div>
                            <strong>Due:</strong> {new Date(milestone.due_at).toLocaleDateString()}
                          </div>
                        )}
                        {milestone.released_at && (
                          <div>
                            <strong>Released:</strong> {new Date(milestone.released_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractDetail;
