const { randomUUID } = require('crypto');
const { query, transaction } = require('../../../lib/db');
const { authenticate } = require('../../../lib/auth');
const { apiHandler } = require('../../../lib/middleware');

/**
 * POST /api/proposals/:id/accept
 * Accept a proposal (client only)
 * Protected: Only the project owner can accept proposals
 * Business Logic:
 * - Sets proposal status to 'accepted'
 * - Rejects all other proposals for the same project
 * - Updates project status to 'awarded'
 * - Creates a contract automatically
 */
const acceptProposal = async (req, res) => {
  const { id } = req.query;

  // Get the proposal with full project and ownership info
  const proposalResult = await query(
    `SELECT p.*,
            p.project_id,
            proj.status as project_status,
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
      message: 'Only the project owner can accept proposals'
    });
  }

  // Check if proposal is already accepted or rejected
  if (proposal.status === 'accepted') {
    return res.status(400).json({
      success: false,
      message: 'This proposal has already been accepted'
    });
  }

  if (proposal.status === 'rejected') {
    return res.status(400).json({
      success: false,
      message: 'Cannot accept a rejected proposal'
    });
  }

  // Check if project is in valid state to accept proposals
  if (proposal.project_status !== 'open') {
    return res.status(400).json({
      success: false,
      message: 'Project is not open for accepting proposals'
    });
  }

  let contractId = null;

  await transaction(async (connection) => {
    // 1. Accept this proposal
    await connection.query(
      'UPDATE proposals SET status = ? WHERE id = ?',
      ['accepted', id]
    );

    // 2. Reject all other proposals for this project
    await connection.query(
      `UPDATE proposals
       SET status = 'rejected'
       WHERE project_id = ?
       AND id != ?
       AND status IN ('submitted', 'shortlisted')`,
      [proposal.project_id, id]
    );

    // 3. Update project status to 'awarded'
    await connection.query(
      'UPDATE projects SET status = ? WHERE id = ?',
      ['awarded', proposal.project_id]
    );

    // 4. Create a contract automatically
    contractId = randomUUID();

    // Get project details to determine contract type and client_id
    const projectResult = await connection.query(
      'SELECT project_type, client_id, currency FROM projects WHERE id = ?',
      [proposal.project_id]
    );

    const project = projectResult.rows[0];
    const contractType = project.project_type; // 'fixed' or 'hourly'
    const agreedAmount = contractType === 'fixed' ? proposal.bid_amount : null;
    const hourlyRate = contractType === 'hourly' ? proposal.hourly_rate : null;

    await connection.query(
      `INSERT INTO contracts
       (id, project_id, client_id, freelancer_id, contract_type, status, agreed_amount, hourly_rate, currency)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        contractId,
        proposal.project_id,
        project.client_id,
        proposal.freelancer_id,
        contractType,
        agreedAmount,
        hourlyRate,
        project.currency
      ]
    );
  });

  // Fetch updated proposal
  const updatedProposal = await query(
    'SELECT * FROM proposals WHERE id = ?',
    [id]
  );

  // Fetch created contract
  const contractResult = await query(
    'SELECT * FROM contracts WHERE id = ?',
    [contractId]
  );

  res.json({
    success: true,
    message: 'Proposal accepted successfully and contract created',
    data: {
      proposal: updatedProposal.rows[0],
      contract: contractResult.rows[0]
    }
  });
};

const handler = async (req, res) => {
  if (req.method === 'POST') {
    return acceptProposal(req, res);
  }
};

module.exports = apiHandler(handler, {
  methods: ['POST'],
  middlewares: [authenticate]
});
