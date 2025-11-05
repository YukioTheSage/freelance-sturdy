const jwt = require('jsonwebtoken');
const { query } = require('../../lib/db');
const { apiHandler } = require('../../lib/middleware');

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */

const handler = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token required'
    });
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  if (decoded.type !== 'refresh') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token type'
    });
  }

  // Check if refresh token exists in database and is not revoked
  const tokenResult = await query(
    'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND revoked = FALSE AND expires_at > NOW()',
    [refreshToken, decoded.userId]
  );

  if (tokenResult.rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }

  // Get user
  const userResult = await query(
    'SELECT id, email, role, first_name, last_name FROM users WHERE id = ?',
    [decoded.userId]
  );

  if (userResult.rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: 'User not found'
    });
  }

  const user = userResult.rows[0];

  // Generate new access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  res.json({
    success: true,
    data: {
      accessToken
    }
  });
};

module.exports = apiHandler(handler, {
  methods: ['POST']
});
