const jwt = require('jsonwebtoken');
const { query } = require('../../lib/db');
const { apiHandler } = require('../../lib/middleware');

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 * Note: Does not require authentication to allow logout even with expired tokens
 */

const handler = async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Verify the refresh token to get the user ID
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Revoke the refresh token
      await query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE token = ? AND user_id = ?',
        [refreshToken, decoded.userId]
      );
    } catch (jwtError) {
      // If token is invalid/expired, still return success
      // The token is unusable anyway
      console.log('Invalid refresh token on logout:', jwtError.message);
    }
  }

  res.json({
    success: true,
    message: 'Logout successful'
  });
};

module.exports = apiHandler(handler, {
  methods: ['POST']
});
