const { query, transaction } = require('../../lib/db');
const { authenticate, authorize } = require('../../lib/auth');
const { apiHandler } = require('../../lib/middleware');

/**
 * GET /api/users
 * Get all users with optional role filter
 * Protected: Requires authentication
 */
const getUsers = async (req, res) => {
  const { role, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT id, email, role, first_name, last_name, phone, country, is_verified, created_at FROM users';
  const params = [];

  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
  } else {
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
  }

  const result = await query(sql, params);
  res.json({
    success: true,
    data: result.rows,
    count: result.rowCount
  });
};

/**
 * POST /api/users
 * Create a new user (with optional profile)
 * NOTE: This endpoint is kept for admin use or testing
 * Regular users should use /api/auth/register
 * Protected: Admin only
 */
const createUser = async (req, res) => {
  try {
    const { email, password, role, first_name, last_name, phone, country, profile } = req.body;

    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Use transaction to create user and profile
    const result = await transaction(async (connection) => {
      // Insert user and return the inserted row
      const userResult = await connection.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, country)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id, email, role, first_name, last_name, phone, country, is_verified, created_at`,
        [email, password, role, first_name, last_name, phone, country]
      );
      const user = userResult.rows[0];

      // Create profile based on role
      if (role === 'freelancer' && profile) {
        await connection.query(
          `INSERT INTO freelancer_profiles (user_id, bio, hourly_rate, experience_years, headline)
           VALUES (?, ?, ?, ?, ?)`,
          [user.id, profile.bio, profile.hourly_rate, profile.experience_years, profile.headline]
        );
        const profileResult = await connection.query(
          'SELECT * FROM freelancer_profiles WHERE user_id = ?',
          [user.id]
        );
        user.profile = profileResult.rows[0];
      } else if (role === 'client' && profile) {
        await connection.query(
          `INSERT INTO client_profiles (user_id, company_name, company_size, website)
           VALUES (?, ?, ?, ?)`,
          [user.id, profile.company_name, profile.company_size, profile.website]
        );
        const profileResult = await connection.query(
          'SELECT * FROM client_profiles WHERE user_id = ?',
          [user.id]
        );
        user.profile = profileResult.rows[0];
      }

      return user;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating user:', error);

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create user'
    });
  }
};

const handler = async (req, res) => {
  if (req.method === 'GET') {
    return getUsers(req, res);
  } else if (req.method === 'POST') {
    return createUser(req, res);
  }
};

module.exports = apiHandler(handler, {
  methods: ['GET', 'POST'],
  middlewares: [
    authenticate,
    // For POST, require admin role
    (req, res, next) => {
      if (req.method === 'POST') {
        return authorize('admin')(req, res, next);
      }
      next();
    }
  ]
});
