const express = require('express');
const { randomUUID } = require('crypto');
const router = express.Router();
const { query, transaction } = require('../db/queries');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

const parseIntOrDefault = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * GET /api/projects
 * Get all projects with filters
 * Public endpoint but shows different data for authenticated users
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { status, project_type, min_budget, max_budget, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT p.*,
             c.company_name,
             CONCAT_WS(' ', u.first_name, u.last_name) AS client_name,
             (SELECT COUNT(*) FROM proposals WHERE project_id = p.id) AS proposal_count
      FROM projects p
      JOIN client_profiles c ON p.client_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (project_type) {
      sql += ' AND p.project_type = ?';
      params.push(project_type);
    }

    if (min_budget) {
      sql += ' AND p.budget_min >= ?';
      params.push(min_budget);
    }

    if (max_budget) {
      sql += ' AND p.budget_max <= ?';
      params.push(max_budget);
    }

    sql += ' ORDER BY p.posted_at DESC LIMIT ? OFFSET ?';
    params.push(parseIntOrDefault(limit, 50), parseIntOrDefault(offset, 0));

    const result = await query(sql, params);

    for (const project of result.rows) {
      const skillsResult = await query(
        `SELECT s.id, s.name, s.category
         FROM skills s
         JOIN project_skills ps ON s.id = ps.skill_id
         WHERE ps.project_id = ?`,
        [project.id]
      );
      project.skills = skillsResult.rows;
      project.proposal_count = Number(project.proposal_count || 0);
    }

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
 * GET /api/projects/:id
 * Get project by ID with full details
 * Protected: Requires authentication
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*,
              c.company_name,
              c.company_size,
              CONCAT_WS(' ', u.first_name, u.last_name) AS client_name,
              u.country AS client_country
       FROM projects p
       JOIN client_profiles c ON p.client_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = result.rows[0];

    const skillsResult = await query(
      `SELECT s.id, s.name, s.category
       FROM skills s
       JOIN project_skills ps ON s.id = ps.skill_id
       WHERE ps.project_id = ?`,
      [id]
    );
    project.skills = skillsResult.rows;

    const proposalCount = await query(
      'SELECT COUNT(*) AS count FROM proposals WHERE project_id = ?',
      [id]
    );
    const countRow = proposalCount.rows[0];
    project.proposal_count = countRow ? Number(countRow.count || 0) : 0;

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects
 * Create a new project
 * Protected: Only clients can create projects
 */
router.post(
  '/',
  authenticate,
  authorize('client', 'admin'),
  [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be at most 255 characters'),
    body('description')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Description must be at most 5000 characters'),
    body('project_type')
      .notEmpty()
      .withMessage('Project type is required')
      .isIn(['fixed', 'hourly'])
      .withMessage('Project type must be either "fixed" or "hourly"'),
    body('budget_min')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum budget must be a positive number'),
    body('budget_max')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum budget must be a positive number'),
    body('currency')
      .optional()
      .isLength({ max: 3 })
      .withMessage('Currency must be a 3-letter code'),
    body('due_at')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 datetime'),
    body('skill_ids')
      .optional()
      .isArray()
      .withMessage('Skill IDs must be an array')
  ],
  validate,
  async (req, res, next) => {
  try {
    const {
      title,
      description,
      project_type,
      budget_min,
      budget_max,
      currency,
      due_at,
      skill_ids = []
    } = req.body;

    // Get the client profile for the authenticated user
    const clientProfileResult = await query(
      'SELECT id FROM client_profiles WHERE user_id = ?',
      [req.user.userId]
    );

    if (clientProfileResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Client profile not found. Only clients can create projects.'
      });
    }

    const client_id = clientProfileResult.rows[0].id;
    const projectId = randomUUID();

    // Convert ISO datetime to MySQL format (YYYY-MM-DD HH:MM:SS)
    let formattedDueAt = null;
    if (due_at) {
      formattedDueAt = new Date(due_at).toISOString().slice(0, 19).replace('T', ' ');
    }

    await transaction(async (connection) => {
      await connection.query(
        `INSERT INTO projects (id, client_id, title, description, project_type, budget_min, budget_max, currency, due_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          client_id,
          title,
          description ?? null,
          project_type,
          budget_min ?? null,
          budget_max ?? null,
          currency ?? 'USD',
          formattedDueAt
        ]
      );

      if (Array.isArray(skill_ids) && skill_ids.length > 0) {
        for (const skillId of skill_ids) {
          await connection.query(
            'INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)',
            [projectId, skillId]
          );
        }
      }
    });

    const projectResult = await query(
      `SELECT p.*,
              c.company_name,
              CONCAT_WS(' ', u.first_name, u.last_name) AS client_name,
              (SELECT COUNT(*) FROM proposals WHERE project_id = p.id) AS proposal_count
       FROM projects p
       JOIN client_profiles c ON p.client_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE p.id = ?`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to create project' });
    }

    const project = projectResult.rows[0];

    const skillsResult = await query(
      `SELECT s.id, s.name, s.category
       FROM skills s
       JOIN project_skills ps ON s.id = ps.skill_id
       WHERE ps.project_id = ?`,
      [projectId]
    );
    project.skills = skillsResult.rows;
    project.proposal_count = Number(project.proposal_count || 0);

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/projects/:id
 * Update project
 * Protected: Only the project owner (client) can update
 */
router.patch(
  '/:id',
  authenticate,
  [
    param('id')
      .isUUID()
      .withMessage('Project ID must be a valid UUID'),
    body('title')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Title must be at most 255 characters'),
    body('description')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Description must be at most 5000 characters'),
    body('budget_min')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum budget must be a positive number'),
    body('budget_max')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum budget must be a positive number'),
    body('status')
      .optional()
      .isIn(['open', 'awarded', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Status must be one of: open, awarded, in_progress, completed, cancelled'),
    body('due_at')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO 8601 datetime')
  ],
  validate,
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, budget_min, budget_max, status, due_at } = req.body;

    // Verify ownership - check if the project belongs to the authenticated user's client profile
    const projectOwnerResult = await query(
      `SELECT p.*, c.user_id 
       FROM projects p
       JOIN client_profiles c ON p.client_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    if (projectOwnerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projectOwnerResult.rows[0];

    // Check if user is the owner or an admin
    if (project.user_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this project'
      });
    }

    // Convert ISO datetime to MySQL format (YYYY-MM-DD HH:MM:SS)
    let formattedDueAt = null;
    if (due_at) {
      formattedDueAt = new Date(due_at).toISOString().slice(0, 19).replace('T', ' ');
    }

    const updateResult = await query(
      `UPDATE projects
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           budget_min = COALESCE(?, budget_min),
           budget_max = COALESCE(?, budget_max),
           status = COALESCE(?, status),
           due_at = COALESCE(?, due_at)
       WHERE id = ?`,
      [
        title ?? null,
        description ?? null,
        budget_min ?? null,
        budget_max ?? null,
        status ?? null,
        formattedDueAt,
        id
      ]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const result = await query(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 * Protected: Only the project owner (client) or admin can delete
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const projectOwnerResult = await query(
      `SELECT p.*, c.user_id 
       FROM projects p
       JOIN client_profiles c ON p.client_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    if (projectOwnerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projectOwnerResult.rows[0];

    // Check if user is the owner or an admin
    if (project.user_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this project'
      });
    }

    const result = await query('DELETE FROM projects WHERE id = ?', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
