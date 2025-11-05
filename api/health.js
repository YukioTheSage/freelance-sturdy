const { query } = require('../lib/db');
const { apiHandler } = require('../lib/middleware');

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */

const handler = async (req, res) => {
  try {
    // Test database connection
    const result = await query('SELECT NOW() as time');

    res.json({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString(),
      database: result.rows.length > 0 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      error: error.message
    });
  }
};

module.exports = apiHandler(handler, {
  methods: ['GET']
});
