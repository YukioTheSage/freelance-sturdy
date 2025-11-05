const { body, param } = require('express-validator');
const { query } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { validate } = require('../../lib/validate');
const { apiHandler } = require('../../lib/middleware');

/**
 * GET /api/contracts/:id
 * Get contract by ID with full details
 * Protected: Requires authentication
 */
const getContract = async (req, res) => {
  const { id } = req.query;

  const result = await query(
    `SELECT c.*,
            proj.title AS project_title,
            proj.description AS project_description,
            proj.project_type,
            CONCAT_WS(' ', uc.first_name, uc.last_name) AS client_name,
            uc.email AS client_email,
            cp.company_name,
            CONCAT_WS(' ', uf.first_name, uf.last_name) AS freelancer_name,
            uf.email AS freelancer_email,
            fp.bio AS freelancer_bio,
            fp.rating_avg AS freelancer_rating
     FROM contracts c
     JOIN projects proj ON c.project_id = proj.id
     JOIN client_profiles cp ON c.client_id = cp.id
     JOIN users uc ON cp.user_id = uc.id
     JOIN freelancer_profiles fp ON c.freelancer_id = fp.id
     JOIN users uf ON fp.user_id = uf.id
     WHERE c.id = ?`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Contract not found' });
  }

  const contract = result.rows[0];

  // Check if user has access to this contract
  const clientProfileResult = await query(
    'SELECT id FROM client_profiles WHERE user_id = ?',
    [req.user.userId]
  );
  const freelancerProfileResult = await query(
    'SELECT id FROM freelancer_profiles WHERE user_id = ?',
    [req.user.userId]
  );

  const isClient = clientProfileResult.rows.length > 0 &&
                   clientProfileResult.rows[0].id === contract.client_id;
  const isFreelancer = freelancerProfileResult.rows.length > 0 &&
                       freelancerProfileResult.rows[0].id === contract.freelancer_id;
  const isAdmin = req.user.role === 'admin';

  if (!isClient && !isFreelancer && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view this contract'
    });
  }

  // Get milestones for this contract
  const milestonesResult = await query(
    'SELECT * FROM milestones WHERE contract_id = ? ORDER BY due_at ASC',
    [id]
  );

  res.json({
    success: true,
    data: {
      ...contract,
      milestones: milestonesResult.rows
    }
  });
};

/**
 * PATCH /api/contracts/:id
 * Update contract (e.g., change status, end date)
 * Protected: Only client or freelancer in the contract can update
 */
const updateContract = async (req, res) => {
  const { id } = req.query;
  const { status, end_at } = req.body;

  // Get the contract with owner info
  const contractResult = await query(
    `SELECT c.*, cp.user_id as client_user_id, fp.user_id as freelancer_user_id
     FROM contracts c
     JOIN client_profiles cp ON c.client_id = cp.id
     JOIN freelancer_profiles fp ON c.freelancer_id = fp.id
     WHERE c.id = ?`,
    [id]
  );

  if (contractResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Contract not found' });
  }

  const contract = contractResult.rows[0];

  // Check permissions
  const isClient = contract.client_user_id === req.user.userId;
  const isFreelancer = contract.freelancer_user_id === req.user.userId;
  const isAdmin = req.user.role === 'admin';

  if (!isClient && !isFreelancer && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to update this contract'
    });
  }

  // Convert ISO datetime to MySQL format (YYYY-MM-DD HH:MM:SS)
  let formattedEndAt = null;
  if (end_at) {
    formattedEndAt = new Date(end_at).toISOString().slice(0, 19).replace('T', ' ');
  }

  const updateResult = await query(
    `UPDATE contracts
     SET status = COALESCE(?, status),
         end_at = COALESCE(?, end_at)
     WHERE id = ?`,
    [status ?? null, formattedEndAt, id]
  );

  if (updateResult.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'Contract not found' });
  }

  const result = await query(
    'SELECT * FROM contracts WHERE id = ?',
    [id]
  );

  res.json({ success: true, data: result.rows[0] });
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getContract(req, res);
  } else if (req.method === 'PATCH') {
    return updateContract(req, res);
  }
};

// Validation rules for PATCH
const patchValidations = [
  param('id')
    .isUUID()
    .withMessage('Contract ID must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled', 'disputed'])
    .withMessage('Status must be one of: active, completed, cancelled, disputed'),
  body('end_at')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 datetime')
];

module.exports = apiHandler(handler, {
  methods: ['GET', 'PATCH'],
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
