const { body, param } = require('express-validator');
const { query } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { validate } = require('../../lib/validate');
const { apiHandler } = require('../../lib/middleware');

/**
 * GET /api/projects/:id
 * Get project by ID with full details
 * Protected: Requires authentication
 */
const getProject = async (req, res) => {
  const { id } = req.query;

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
};

/**
 * PATCH /api/projects/:id
 * Update project
 * Protected: Only the project owner (client) can update
 */
const updateProject = async (req, res) => {
  const { id } = req.query;
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
};

/**
 * DELETE /api/projects/:id
 * Delete a project
 * Protected: Only the project owner (client) or admin can delete
 */
const deleteProject = async (req, res) => {
  const { id } = req.query;

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
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getProject(req, res);
  } else if (req.method === 'PATCH') {
    return updateProject(req, res);
  } else if (req.method === 'DELETE') {
    return deleteProject(req, res);
  }
};

// Validation rules for PATCH
const patchValidations = [
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
