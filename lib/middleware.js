/**
 * Utility to run middleware in Vercel serverless functions
 * Since we don't have Express app.use(), we need to manually run middleware
 */

/**
 * Run a single middleware function
 * @param {Function} middleware - Express middleware function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const runMiddleware = (middleware) => {
  return (req, res) => {
    return new Promise((resolve, reject) => {
      middleware(req, res, (result) => {
        if (result instanceof Error) {
          return reject(result);
        }
        return resolve(result);
      });
    });
  };
};

/**
 * Run multiple middleware functions in sequence
 * @param {Array<Function>} middlewares - Array of Express middleware functions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<void>}
 */
const runMiddlewares = async (middlewares, req, res) => {
  for (const middleware of middlewares) {
    await runMiddleware(middleware)(req, res);
  }
};

/**
 * CORS headers helper for Vercel serverless functions
 */
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': process.env.CLIENT_URL || '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

/**
 * Apply CORS headers to response
 */
const applyCors = (res) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

/**
 * Handle OPTIONS request (CORS preflight)
 */
const handleOptions = (req, res) => {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return true;
  }
  return false;
};

/**
 * API handler wrapper with CORS, error handling, and method validation
 * @param {Function} handler - The actual handler function
 * @param {Object} options - Options { methods: ['GET', 'POST'], middlewares: [] }
 */
const apiHandler = (handler, options = {}) => {
  const { methods = ['GET'], middlewares = [] } = options;

  return async (req, res) => {
    try {
      // Apply CORS
      applyCors(res);

      // Handle OPTIONS request
      if (handleOptions(req, res)) {
        return;
      }

      // Validate HTTP method
      if (!methods.includes(req.method)) {
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed. Allowed methods: ${methods.join(', ')}`
        });
      }

      // Run middlewares
      if (middlewares.length > 0) {
        await runMiddlewares(middlewares, req, res);
      }

      // Run the actual handler
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);

      // If response already sent, don't send again
      if (res.headersSent) {
        return;
      }

      // Handle specific error types
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
          error: error.message
        });
      }

      // PostgreSQL errors
      if (error.code && error.code.startsWith('2')) {
        const errorHandler = require('./errorHandler');
        return errorHandler(error, req, res, () => {});
      }

      // Generic error
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  };
};

module.exports = {
  runMiddleware,
  runMiddlewares,
  applyCors,
  handleOptions,
  apiHandler,
  corsHeaders
};
