const { body, param } = require('express-validator');
const { query } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { validate } = require('../../lib/validate');
const { apiHandler } = require('../../lib/middleware');

/**
 * GET /api/proposals/:id
 * Get proposal by ID with full details
 * Protected: Requires authentication
 */
const getProposal = async (req, res) => {
  const { id } = req.query;

  const result = await query(
    `SELECT p.*,
            proj.title AS project_title,
            proj.description AS project_description,
            CONCAT_WS(' ', u.first_name, u.last_name) AS freelancer_name,
            u.email AS freelancer_email,
            fp.bio AS freelancer_bio,
            fp.rating_avg AS freelancer_rating,
            fp.rating_count AS freelancer_rating_count,
            fp.experience_years AS freelancer_experience
     FROM proposals p
     JOIN projects proj ON p.project_id = proj.id
     JOIN freelancer_profiles fp ON p.freelancer_id = fp.id
     JOIN users u ON fp.user_id = u.id
     WHERE p.id = ?`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }

  res.json({ success: true, data: result.rows[0] });
};

/**
 * PATCH /api/proposals/:id
 * Update proposal (e.g., change status, update bid)
 * Protected: Freelancer can update their own proposal, Client can update status
 */
const updateProposal = async (req, res) => {
  const { id } = req.query;
  const { bid_amount, hourly_rate, estimated_hours, cover_letter, status } = req.body;

  // Get the proposal with owner info
  const proposalResult = await query(
    `SELECT p.*, fp.user_id as freelancer_user_id, cp.user_id as client_user_id
     FROM proposals p
     JOIN freelancer_profiles fp ON p.freelancer_id = fp.id
     JOIN projects proj ON p.project_id = proj.id
     JOIN client_profiles cp ON proj.client_id = cp.id
     WHERE p.id = ?`,
    [id]
  );

  if (proposalResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }

  const proposal = proposalResult.rows[0];

  // Check permissions
  const isFreelancerOwner = proposal.freelancer_user_id === req.user.userId;
  const isProjectOwner = proposal.client_user_id === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isFreelancerOwner && !isProjectOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to update this proposal'
    });
  }

  // Freelancers can only update bid details, not status
  // Clients can only update status
  let updateFields = {};

  if (isFreelancerOwner && !isProjectOwner) {
    // Freelancer updating their own proposal
    updateFields = {
      bid_amount: bid_amount ?? null,
      hourly_rate: hourly_rate ?? null,
      estimated_hours: estimated_hours ?? null,
      cover_letter: cover_letter ?? null
    };
  } else if (isProjectOwner || isAdmin) {
    // Client or admin updating status
    if (status) {
      updateFields.status = status;
    }
  }

  const updateResult = await query(
    `UPDATE proposals
     SET bid_amount = COALESCE(?, bid_amount),
         hourly_rate = COALESCE(?, hourly_rate),
         estimated_hours = COALESCE(?, estimated_hours),
         cover_letter = COALESCE(?, cover_letter),
         status = COALESCE(?, status)
     WHERE id = ?`,
    [
      updateFields.bid_amount ?? null,
      updateFields.hourly_rate ?? null,
      updateFields.estimated_hours ?? null,
      updateFields.cover_letter ?? null,
      updateFields.status ?? null,
      id
    ]
  );

  if (updateResult.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }

  const result = await query(
    'SELECT * FROM proposals WHERE id = ?',
    [id]
  );

  res.json({ success: true, data: result.rows[0] });
};

/**
 * DELETE /api/proposals/:id
 * Withdraw/delete a proposal
 * Protected: Only the freelancer who created it can delete
 */
const deleteProposal = async (req, res) => {
  const { id } = req.query;

  // Get the proposal with owner info
  const proposalResult = await query(
    `SELECT p.*, fp.user_id as freelancer_user_id
     FROM proposals p
     JOIN freelancer_profiles fp ON p.freelancer_id = fp.id
     WHERE p.id = ?`,
    [id]
  );

  if (proposalResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }

  const proposal = proposalResult.rows[0];

  // Check if user is the owner or an admin
  if (proposal.freelancer_user_id !== req.user.userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to delete this proposal'
    });
  }

  const result = await query('DELETE FROM proposals WHERE id = ?', [id]);

  if (result.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }

  res.json({ success: true, message: 'Proposal deleted successfully' });
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getProposal(req, res);
  } else if (req.method === 'PATCH') {
    return updateProposal(req, res);
  } else if (req.method === 'DELETE') {
    return deleteProposal(req, res);
  }
};

// Validation rules for PATCH
const patchValidations = [
  param('id')
    .isUUID()
    .withMessage('Proposal ID must be a valid UUID'),
  body('bid_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bid amount must be a positive number'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('estimated_hours')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated hours must be a positive integer'),
  body('cover_letter')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Cover letter must be at most 5000 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected', 'withdrawn'])
    .withMessage('Status must be one of: pending, accepted, rejected, withdrawn')
];

module.exports = apiHandler(handler, {
  methods: ['GET', 'PATCH', 'DELETE'],
  middlewares: [
    authenticate,
    (req, res, next) => {
      if (req.method === 'PATCH') {
        // Set req.params for validation
        req.params = { id: req.query.id };
        // Apply validations
        return Promise.all(patchValidations.map(v => v.run(req)))
          .then(() => validate(req, res, next))
          .catch(next);
      }
      next();
    }
  ]
});
