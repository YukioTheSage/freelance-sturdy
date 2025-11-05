const { query } = require('../../lib/db');
const { authenticate } = require('../../lib/auth');
const { apiHandler } = require('../../lib/middleware');

const parseIntOrDefault = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * GET /api/contracts
 * Get contracts with filters
 * Protected: Requires authentication
 */
const getContracts = async (req, res) => {
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
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getContracts(req, res);
  }
};

module.exports = apiHandler(handler, {
  methods: ['GET'],
  middlewares: [authenticate]
});
