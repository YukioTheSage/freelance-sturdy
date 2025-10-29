const express = require('express');
const { randomUUID } = require('crypto');
const router = express.Router();
const { query } = require('../db/queries');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

const parseIntOrDefault = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * GET /api/proposals
 * Get proposals with filters
 * Protected: Requires authentication
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { project_id, freelancer_id, status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT p.*,
             proj.title AS project_title,
             CONCAT_WS(' ', u.first_name, u.last_name) AS freelancer_name,
             fp.rating_avg AS freelancer_rating,
             fp.hourly_rate AS freelancer_hourly_rate
      FROM proposals p
      JOIN projects proj ON p.project_id = proj.id
      JOIN freelancer_profiles fp ON p.freelancer_id = fp.id
      JOIN users u ON fp.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (project_id) {
      sql += ' AND p.project_id = ?';
      params.push(project_id);
    }

    if (freelancer_id) {
      sql += ' AND p.freelancer_id = ?';
      params.push(freelancer_id);
    }

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY p.submitted_at DESC LIMIT ? OFFSET ?';
    params.push(parseIntOrDefault(limit, 50), parseIntOrDefault(offset, 0));

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/proposals/:id
 * Get proposal by ID with full details
 * Protected: Requires authentication
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

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
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/proposals
 * Submit a new proposal
 * Protected: Only freelancers can submit proposals
 */
router.post(
  '/',
  authenticate,
  authorize('freelancer', 'admin'),
  [
    body('project_id')
      .notEmpty()
      .withMessage('Project ID is required')
      .isUUID()
      .withMessage('Project ID must be a valid UUID'),
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
      .notEmpty()
      .withMessage('Cover letter is required')
      .isLength({ max: 5000 })
      .withMessage('Cover letter must be at most 5000 characters')
  ],
  validate,
  async (req, res, next) => {
  try {
    const {
      project_id,
      bid_amount,
      hourly_rate,
      estimated_hours,
      cover_letter
    } = req.body;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: 'project_id is required'
      });
    }

    // Get the freelancer profile for the authenticated user
    const freelancerProfileResult = await query(
      'SELECT id FROM freelancer_profiles WHERE user_id = ?',
      [req.user.userId]
    );

    if (freelancerProfileResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Freelancer profile not found. Only freelancers can submit proposals.'
      });
    }

    const freelancer_id = freelancerProfileResult.rows[0].id;

    // Validate that the project exists
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = ?',
      [project_id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if a proposal already exists for this freelancer and project
    const existingProposal = await query(
      'SELECT id FROM proposals WHERE project_id = ? AND freelancer_id = ?',
      [project_id, freelancer_id]
    );

    if (existingProposal.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a proposal for this project'
      });
    }

    const proposalId = randomUUID();

    await query(
      `INSERT INTO proposals (id, project_id, freelancer_id, bid_amount, hourly_rate, estimated_hours, cover_letter)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        proposalId,
        project_id,
        freelancer_id,
        bid_amount ?? null,
        hourly_rate ?? null,
        estimated_hours ?? null,
        cover_letter ?? null
      ]
    );

    const result = await query(
      'SELECT * FROM proposals WHERE id = ?',
      [proposalId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a proposal for this project'
      });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reference: freelancer or project does not exist'
      });
    }
    next(error);
  }
});

/**
 * POST /api/proposals/:id/accept
 * Accept a proposal (client only)
 * Protected: Only the project owner can accept proposals
 * Business Logic:
 * - Sets proposal status to 'accepted'
 * - Rejects all other proposals for the same project
 * - Updates project status to 'awarded'
 */
router.post('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

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

    // Use transaction to ensure atomicity
    const { transaction } = require('../db/queries');
    
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
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/proposals/:id/reject
 * Reject a proposal (client only)
 * Protected: Only the project owner can reject proposals
 */
router.post('/:id/reject', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

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
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/proposals/:id
 * Update proposal (e.g., change status, update bid)
 * Protected: Freelancer can update their own proposal, Client can update status
 */
router.patch(
  '/:id',
  authenticate,
  [
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
  ],
  validate,
  async (req, res, next) => {
  try {
    const { id } = req.params;
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
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/proposals/:id
 * Withdraw/delete a proposal
 * Protected: Only the freelancer who created it can delete
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

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
  } catch (error) {
    next(error);
  }
});

module.exports = router;
