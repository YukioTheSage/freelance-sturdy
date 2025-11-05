const { randomUUID } = require('crypto');
const { body } = require('express-validator');
const { query } = require('../../lib/db');
const { authenticate, authorize } = require('../../lib/auth');
const { validate } = require('../../lib/validate');
const { apiHandler } = require('../../lib/middleware');

const parseIntOrDefault = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * GET /api/proposals
 * Get proposals with filters
 * Protected: Requires authentication
 */
const getProposals = async (req, res) => {
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
};

/**
 * POST /api/proposals
 * Submit a new proposal
 * Protected: Only freelancers can submit proposals
 */
const createProposal = async (req, res) => {
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

  try {
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
    throw error;
  }
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getProposals(req, res);
  } else if (req.method === 'POST') {
    return createProposal(req, res);
  }
};

// Validation rules for POST
const postValidations = [
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
];

module.exports = apiHandler(handler, {
  methods: ['GET', 'POST'],
  middlewares: [
    authenticate,
    (req, res, next) => {
      if (req.method === 'POST') {
        return authorize('freelancer', 'admin')(req, res, next);
      }
      next();
    },
    (req, res, next) => {
      if (req.method === 'POST') {
        // Apply validations
        return Promise.all(postValidations.map(v => v.run(req)))
          .then(() => validate(req, res, next))
          .catch(next);
      }
      next();
    }
  ]
});
