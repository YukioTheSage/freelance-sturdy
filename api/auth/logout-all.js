const { query } = require('../../lib/db');
const { apiHandler } = require('../../lib/middleware');
const { authenticate } = require('../../lib/auth');

/**
 * POST /api/auth/logout-all
 * Logout from all devices (revoke all refresh tokens)
 */

const handler = async (req, res) => {
  // Revoke all refresh tokens for this user
  await query(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?',
    [req.user.userId]
  );

  res.json({
    success: true,
    message: 'Logged out from all devices'
  });
};

module.exports = apiHandler(handler, {
  methods: ['POST'],
  middlewares: [authenticate]
});
