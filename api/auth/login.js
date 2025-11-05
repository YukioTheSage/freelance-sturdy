const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const { query } = require('../../lib/db');
const { validate } = require('../../lib/validate');
const { apiHandler } = require('../../lib/middleware');
const { generateTokens, saveRefreshToken } = require('../../lib/authHelpers');

/**
 * POST /api/auth/login
 * Login with email and password
 *
 * NOTE: Rate limiting in serverless requires external service like Upstash Redis
 */

const handler = async (req, res) => {
  const { email, password } = req.body;

  // Get user with password
  const userResult = await query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (userResult.rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const user = userResult.rows[0];

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Get profile based on role
  if (user.role === 'freelancer') {
    const profileResult = await query(
      'SELECT * FROM freelancer_profiles WHERE user_id = ?',
      [user.id]
    );
    user.profile = profileResult.rows[0] || null;
  } else if (user.role === 'client') {
    const profileResult = await query(
      'SELECT * FROM client_profiles WHERE user_id = ?',
      [user.id]
    );
    user.profile = profileResult.rows[0] || null;
  }

  // Remove password from response
  delete user.password_hash;

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Save refresh token to database
  await saveRefreshToken(user.id, refreshToken);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      accessToken,
      refreshToken
    }
  });
};

// Validation middleware
const validations = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

module.exports = apiHandler(handler, {
  methods: ['POST'],
  middlewares: [...validations, validate]
});
