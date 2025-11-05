const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { query, transaction } = require('../db/queries');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helper function to generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Helper function to save refresh token to database
 */
const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // PostgreSQL accepts ISO format directly
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt.toISOString()]
  );
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  registerLimiter,
  [
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
  ],
  validate,
  async (req, res, next) => {
    try {
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
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  loginLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validate,
  async (req, res, next) => {
    try {
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
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
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
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 * Note: Does not require authentication to allow logout even with expired tokens
 */
router.post('/logout', async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices (revoke all refresh tokens)
 */
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    // Revoke all refresh tokens for this user
    await query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?',
      [req.user.userId]
    );

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // Get user with profile
    const userResult = await query(
      'SELECT id, email, role, first_name, last_name, phone, country, is_verified, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

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

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
