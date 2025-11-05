const { apiHandler } = require('../../lib/middleware');
const { authenticate } = require('../../lib/auth');
const { getUserWithProfile } = require('../../lib/authHelpers');

/**
 * GET /api/auth/me
 * Get current user info
 */

const handler = async (req, res) => {
  const user = await getUserWithProfile(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: user
  });
};

module.exports = apiHandler(handler, {
  methods: ['GET'],
  middlewares: [authenticate]
});
