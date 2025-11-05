const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db/queries');
const { authenticate, authorize, verifyOwnership } = require('../middleware/auth');

/**
 * GET /api/users
 * Get all users with optional role filter
 * Protected: Requires authentication
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID with profile details
 * Protected: Requires authentication
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user basic info
    const userResult = await query(
      'SELECT id, email, role, first_name, last_name, phone, country, is_verified, created_at FROM users WHERE id = ?',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get profile based on role
    if (user.role === 'freelancer') {
      const profileResult = await query(
        'SELECT * FROM freelancer_profiles WHERE user_id = ?',
        [id]
      );
      user.profile = profileResult.rows[0] || null;
    } else if (user.role === 'client') {
      const profileResult = await query(
        'SELECT * FROM client_profiles WHERE user_id = ?',
        [id]
      );
      user.profile = profileResult.rows[0] || null;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users
 * Create a new user (with optional profile)
 * NOTE: This endpoint is kept for admin use or testing
 * Regular users should use /api/auth/register
 * Protected: Admin only
 */
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
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
    if (error.code === 'ER_DUP_ENTRY') { // MySQL Unique violation
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    next(error);
  }
});

/**
 * PATCH /api/users/:id
 * Update user information
 * Protected: User can only update their own profile, or admin can update any
 */
router.patch('/:id', authenticate, verifyOwnership(), async (req, res, next) => {
  try {
    const { id } = req.params;
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
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (cascades to profiles)
 * Protected: User can delete own account, or admin can delete any
 */
router.delete('/:id', authenticate, verifyOwnership(), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM users WHERE id = ?', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
