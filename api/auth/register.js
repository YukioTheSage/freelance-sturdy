const bcrypt = require('bcrypt');
const { body } = require('express-validator');
const { query, transaction } = require('../../lib/db');
const { validate } = require('../../lib/validate');
const { apiHandler } = require('../../lib/middleware');
const { generateTokens, saveRefreshToken } = require('../../lib/authHelpers');

/**
 * POST /api/auth/register
 * Register a new user
 *
 * NOTE: Rate limiting in serverless requires external service like Upstash Redis
 * For production, consider using @upstash/ratelimit or Vercel's Edge Config
 */

const handler = async (req, res) => {
  const { email, password, role, first_name, last_name, phone, country, profile } = req.body;

  // Check if user already exists
  const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);

  if (existingUser.rows.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered. Please login or use a different email.'
    });
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user with profile in transaction
  const result = await transaction(async (connection) => {
    // Generate UUID for the new user
    const uuidResult = await connection.query('SELECT gen_random_uuid() as id');
    const userId = uuidResult.rows[0].id;

    // Insert user with the generated UUID
    await connection.query(
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, passwordHash, role, first_name, last_name, phone, country]
    );

    // Get the inserted user
    const userResult = await connection.query(
      'SELECT id, email, role, first_name, last_name, phone, country, is_verified, created_at FROM users WHERE id = ?',
      [userId]
    );
    const user = userResult.rows[0];

    // Create profile based on role
    if (role === 'freelancer' && profile) {
      await connection.query(
        `INSERT INTO freelancer_profiles (user_id, bio, hourly_rate, experience_years, headline)
         VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          profile.bio || null,
          profile.hourly_rate || null,
          profile.experience_years || null,
          profile.headline || null
        ]
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
        [
          user.id,
          profile.company_name || null,
          profile.company_size || null,
          profile.website || null
        ]
      );

      const profileResult = await connection.query(
        'SELECT * FROM client_profiles WHERE user_id = ?',
        [user.id]
      );
      user.profile = profileResult.rows[0];
    }

    return user;
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(result);

  // Save refresh token to database
  await saveRefreshToken(result.id, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: result,
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
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .isIn(['freelancer', 'client'])
    .withMessage('Role must be either freelancer or client'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid phone number'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters')
];

module.exports = apiHandler(handler, {
  methods: ['POST'],
  middlewares: [...validations, validate]
});
