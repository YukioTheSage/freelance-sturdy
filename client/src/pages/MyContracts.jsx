import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MyContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await contractsAPI.getAll();
      setContracts(response.data.data);
    } catch (err) {
      setError('Failed to load contracts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      active: { backgroundColor: '#28a745', color: 'white' },
      completed: { backgroundColor: '#007bff', color: 'white' },
      terminated: { backgroundColor: '#dc3545', color: 'white' },
    };
    return styles[status] || {};
  };

  const filteredContracts = contracts.filter(
    (contract) => filterStatus === 'all' || contract.status === filterStatus
  );

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading contracts...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '1.5rem' }}>My Contracts</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Filter buttons */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('all')}
          className={`btn ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.875rem' }}
        >
          All ({contracts.length})
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`btn ${filterStatus === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.875rem' }}
        >
          Active ({contracts.filter((c) => c.status === 'active').length})
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          className={`btn ${filterStatus === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.875rem' }}
        >
          Completed ({contracts.filter((c) => c.status === 'completed').length})
        </button>
        <button
          onClick={() => setFilterStatus('terminated')}
          className={`btn ${filterStatus === 'terminated' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.875rem' }}
        >
          Terminated ({contracts.filter((c) => c.status === 'terminated').length})
        </button>
      </div>

      {filteredContracts.length === 0 ? (
        <div className="empty-state">
          <h3>No {filterStatus !== 'all' ? filterStatus : ''} contracts</h3>
          <p>
            {filterStatus === 'all'
              ? 'Contracts will appear here when proposals are accepted'
              : `No ${filterStatus} contracts found`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredContracts.map((contract) => (
            <div key={contract.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3>{contract.project_title}</h3>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginTop: '0.5rem',
                      ...getStatusBadgeStyle(contract.status),
                    }}
                  >
                    {contract.status}
                  </div>

                  <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <strong>Type:</strong> {contract.contract_type}
                    </div>
                    {contract.contract_type === 'fixed' && contract.agreed_amount && (
                      <div>
                        <strong>Amount:</strong> ${contract.agreed_amount} {contract.currency}
                      </div>
                    )}
                    {contract.contract_type === 'hourly' && contract.hourly_rate && (
                      <div>
                        <strong>Rate:</strong> ${contract.hourly_rate}/hr
                      </div>
                    )}
                    <div>
                      <strong>Started:</strong> {new Date(contract.start_at).toLocaleDateString()}
                    </div>
                    {contract.end_at && (
                      <div>
                        <strong>Ended:</strong> {new Date(contract.end_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    {user.role === 'client' ? (
                      <p>
                        <strong>Freelancer:</strong> {contract.freelancer_name}
                        {contract.freelancer_rating && (
                          <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                            ({contract.freelancer_rating}/5 ⭐)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p>
                        <strong>Client:</strong> {contract.client_name}
                        {contract.company_name && ` (${contract.company_name})`}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigate(`/contracts/${contract.id}`)}
                    className="btn btn-primary"
                  >
                    View Details
                  </button>
                  {contract.status === 'active' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Mark this contract as completed?')) {
                          contractsAPI.update(contract.id, { status: 'completed' })
                            .then(() => fetchContracts())
                            .catch(err => alert('Failed to update contract'));
                        }
                      }}
                      className="btn btn-success"
                      style={{ fontSize: '0.875rem' }}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyContracts;
