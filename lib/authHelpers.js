const jwt = require('jsonwebtoken');
const { query } = require('./db');

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

  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt.toISOString()]
  );
};

/**
 * Helper function to get user with profile
 */
const getUserWithProfile = async (userId) => {
  const userResult = await query(
    'SELECT id, email, role, first_name, last_name, phone, country, is_verified, created_at FROM users WHERE id = ?',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return null;
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

  return user;
};

module.exports = {
  generateTokens,
  saveRefreshToken,
  getUserWithProfile
};
