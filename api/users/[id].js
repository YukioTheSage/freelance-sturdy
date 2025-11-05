const { query } = require('../../lib/db');
const { authenticate, verifyOwnership } = require('../../lib/auth');
const { apiHandler } = require('../../lib/middleware');
const { getUserWithProfile } = require('../../lib/authHelpers');

/**
 * GET /api/users/:id
 * Get user by ID with profile details
 * Protected: Requires authentication
 */
const getUser = async (req, res) => {
  const { id } = req.query;

  const user = await getUserWithProfile(id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, data: user });
};

/**
 * PATCH /api/users/:id
 * Update user information
 * Protected: User can only update their own profile, or admin can update any
 */
const updateUser = async (req, res) => {
  const { id } = req.query;
  const { first_name, last_name, phone, country } = req.body;

  const updateResult = await query(
    `UPDATE users
     SET first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         phone = COALESCE(?, phone),
         country = COALESCE(?, country),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [first_name, last_name, phone, country, id]
  );

  if (updateResult.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Fetch the updated user
  const result = await query(
    'SELECT id, email, role, first_name, last_name, phone, country, is_verified, updated_at FROM users WHERE id = ?',
    [id]
  );

  res.json({ success: true, data: result.rows[0] });
};

/**
 * DELETE /api/users/:id
 * Delete a user (cascades to profiles)
 * Protected: User can delete own account, or admin can delete any
 */
const deleteUser = async (req, res) => {
  const { id } = req.query;

  const result = await query('DELETE FROM users WHERE id = ?', [id]);

  if (result.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, message: 'User deleted successfully' });
};

const handler = async (req, res) => {
  // Add id to params for verifyOwnership middleware
  req.params = { id: req.query.id };

  if (req.method === 'GET') {
    return getUser(req, res);
  } else if (req.method === 'PATCH') {
    return updateUser(req, res);
  } else if (req.method === 'DELETE') {
    return deleteUser(req, res);
  }
};

module.exports = apiHandler(handler, {
  methods: ['GET', 'PATCH', 'DELETE'],
  middlewares: [
    authenticate,
    // For PATCH and DELETE, verify ownership
    (req, res, next) => {
      req.params = { id: req.query.id };
      if (req.method === 'PATCH' || req.method === 'DELETE') {
        return verifyOwnership()(req, res, next);
      }
      next();
    }
  ]
});
