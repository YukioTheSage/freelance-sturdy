import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { proposalsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import Button from '../components/ui/Button';
import SkeletonCard from '../components/ui/SkeletonCard';

const MyProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const { user, isFreelancer } = useAuth();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!isFreelancer) {
      navigate('/');
      return;
    }
    fetchProposals();
  }, [isFreelancer, navigate]);

  const fetchProposals = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await proposalsAPI.getAll({
        freelancer_id: user.profile.id,
      });
      setProposals(response.data.data);
    } catch (err) {
      setError('Failed to load proposals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (proposalId) => {
    const confirmed = await confirm({
      title: 'Withdraw Proposal',
      message: 'Are you sure you want to withdraw this proposal? This action cannot be undone.',
      confirmText: 'Withdraw',
      variant: 'danger'
    });

    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [proposalId]: true }));
    try {
      await proposalsAPI.delete(proposalId);
      setProposals(proposals.filter((p) => p.id !== proposalId));
      toast.success('Proposal withdrawn successfully!');
    } catch (err) {
      toast.error('Failed to withdraw proposal');
      console.error(err);
    } finally {
      setActionLoading(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h1 style={{ marginBottom: '1.5rem' }}>My Proposals</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SkeletonCard count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '1.5rem' }}>My Proposals</h1>

      {error && <div className="error-message">{error}</div>}

      {proposals.length === 0 ? (
        <div className="empty-state">
          <h3>No proposals yet</h3>
          <p>Browse projects and submit proposals to get started</p>
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Browse Projects
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {proposals.map((proposal) => (
            <div key={proposal.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{ cursor: 'pointer', color: '#3498db' }}
                    onClick={() => navigate(`/projects/${proposal.project_id}`)}
                  >
                    {proposal.project_title}
                  </h3>
                  <div className={`status-badge status-${proposal.status}`} style={{ marginTop: '0.5rem' }}>
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
                    {proposal.hourly_rate && proposal.estimated_hours && (
                      <p>
                        <strong>Estimated Hours:</strong> {proposal.estimated_hours}h
                      </p>
                    )}
                  </div>

                  {proposal.cover_letter && (
                    <div style={{ marginTop: '1rem' }}>
                      <strong>Cover Letter:</strong>
                      <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                        {proposal.cover_letter.substring(0, 200)}
                        {proposal.cover_letter.length > 200 && '...'}
                      </p>
                    </div>
                  )}

                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    Submitted: {new Date(proposal.submitted_at).toLocaleDateString()}
                  </p>
                </div>

                {proposal.status === 'pending' && (
                  <Button
                    onClick={() => handleWithdraw(proposal.id)}
                    variant="danger"
                    loading={actionLoading[proposal.id]}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProposals;
