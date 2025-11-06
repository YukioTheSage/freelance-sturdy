const { randomUUID } = require('crypto');
const { body } = require('express-validator');
const { query, transaction } = require('../../lib/db');
const { authenticate, authorize, optionalAuth } = require('../../lib/auth');
const { validate } = require('../../lib/validate');
const { apiHandler } = require('../../lib/middleware');

const parseIntOrDefault = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * GET /api/projects
 * Get all projects with filters
 * Public endpoint but shows different data for authenticated users
 */
const getProjects = async (req, res) => {
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
};

/**
 * POST /api/projects
 * Create a new project
 * Protected: Only clients can create projects
 */
const createProject = async (req, res) => {
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
    console.error('Error creating project:', error);

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create project'
    });
  }
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getProjects(req, res);
  } else if (req.method === 'POST') {
    return createProject(req, res);
  }
};

// Validation rules for POST
const postValidations = [
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
];

module.exports = apiHandler(handler, {
  methods: ['GET', 'POST'],
  middlewares: [
    (req, res, next) => {
      if (req.method === 'GET') {
        return optionalAuth(req, res, next);
      }
      next();
    },
    (req, res, next) => {
      if (req.method === 'POST') {
        return authenticate(req, res, next);
      }
      next();
    },
    (req, res, next) => {
      if (req.method === 'POST') {
        return authorize('client', 'admin')(req, res, next);
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
