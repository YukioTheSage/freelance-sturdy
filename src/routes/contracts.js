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
 * GET /api/contracts
 * Get contracts with filters
 * Protected: Requires authentication
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { project_id, client_id, freelancer_id, status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT c.*,
             proj.title AS project_title,
             CONCAT_WS(' ', uc.first_name, uc.last_name) AS client_name,
             cp.company_name,
             CONCAT_WS(' ', uf.first_name, uf.last_name) AS freelancer_name,
             fp.hourly_rate AS freelancer_hourly_rate
      FROM contracts c
      JOIN projects proj ON c.project_id = proj.id
      JOIN client_profiles cp ON c.client_id = cp.id
      JOIN users uc ON cp.user_id = uc.id
      JOIN freelancer_profiles fp ON c.freelancer_id = fp.id
      JOIN users uf ON fp.user_id = uf.id
      WHERE 1=1
    `;

    const params = [];

    if (project_id) {
      sql += ' AND c.project_id = ?';
      params.push(project_id);
    }

    if (client_id) {
      sql += ' AND c.client_id = ?';
      params.push(client_id);
    }

    if (freelancer_id) {
      sql += ' AND c.freelancer_id = ?';
      params.push(freelancer_id);
    }

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    // Filter by user role
    if (req.user.role === 'client') {
      const clientProfileResult = await query(
        'SELECT id FROM client_profiles WHERE user_id = ?',
        [req.user.userId]
      );
      if (clientProfileResult.rows.length > 0) {
        sql += ' AND c.client_id = ?';
        params.push(clientProfileResult.rows[0].id);
      }
    } else if (req.user.role === 'freelancer') {
      const freelancerProfileResult = await query(
        'SELECT id FROM freelancer_profiles WHERE user_id = ?',
        [req.user.userId]
      );
      if (freelancerProfileResult.rows.length > 0) {
        sql += ' AND c.freelancer_id = ?';
        params.push(freelancerProfileResult.rows[0].id);
      }
    }

    sql += ' ORDER BY c.start_at DESC LIMIT ? OFFSET ?';
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
 * GET /api/contracts/:id
 * Get contract by ID with full details
 * Protected: Requires authentication
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

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
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/contracts/:id
 * Update contract (e.g., change status, end date)
 * Protected: Only client or freelancer in the contract can update
 */
router.patch(
  '/:id',
  authenticate,
  [
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
  ],
  validate,
  async (req, res, next) => {
  try {
    const { id } = req.params;
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
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/contracts/:id
 * Terminate a contract
 * Protected: Only admin or mutual agreement
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM contracts WHERE id = ?', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    res.json({ success: true, message: 'Contract deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
