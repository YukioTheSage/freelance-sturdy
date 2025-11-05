const { query } = require('../../../lib/db');
const { authenticate } = require('../../../lib/auth');
const { apiHandler } = require('../../../lib/middleware');

/**
 * POST /api/proposals/:id/reject
 * Reject a proposal (client only)
 * Protected: Only the project owner can reject proposals
 */
const rejectProposal = async (req, res) => {
  const { id } = req.query;

  // Get the proposal with ownership info
  const proposalResult = await query(
    `SELECT p.*,
            cp.user_id as client_user_id
     FROM proposals p
     JOIN projects proj ON p.project_id = proj.id
     JOIN client_profiles cp ON proj.client_id = cp.id
     WHERE p.id = ?`,
    [id]
  );

  if (proposalResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }

  const proposal = proposalResult.rows[0];

  // Check if user is the project owner or admin
  const isProjectOwner = proposal.client_user_id === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isProjectOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only the project owner can reject proposals'
    });
  }

  // Check if proposal is already accepted
  if (proposal.status === 'accepted') {
    return res.status(400).json({
      success: false,
      message: 'Cannot reject an accepted proposal'
    });
  }

  // Update proposal status to rejected
  await query(
    'UPDATE proposals SET status = ? WHERE id = ?',
    ['rejected', id]
  );

  const updatedProposal = await query(
    'SELECT * FROM proposals WHERE id = ?',
    [id]
  );

  res.json({
    success: true,
    message: 'Proposal rejected successfully',
    data: updatedProposal.rows[0]
  });
};

const handler = async (req, res) => {
  if (req.method === 'POST') {
    return rejectProposal(req, res);
  }
};

module.exports = apiHandler(handler, {
  methods: ['POST'],
  middlewares: [authenticate]
});
