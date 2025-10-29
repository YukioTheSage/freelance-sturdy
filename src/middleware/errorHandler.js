/**
 * Global error handler middleware for MySQL
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // MySQL database errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY': // Duplicate entry (1062)
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry',
          error: err.sqlMessage
        });
      case 'ER_NO_REFERENCED_ROW': // Foreign key violation - no referenced row (1216)
      case 'ER_ROW_IS_REFERENCED': // Foreign key violation - row is referenced (1217)
      case 'ER_NO_REFERENCED_ROW_2': // Foreign key violation (1452)
      case 'ER_ROW_IS_REFERENCED_2': // Foreign key violation (1451)
        return res.status(400).json({
          success: false,
          message: 'Invalid reference',
          error: err.sqlMessage
        });
      case 'ER_BAD_NULL_ERROR': // NOT NULL constraint violation (1048)
        return res.status(400).json({
          success: false,
          message: 'Missing required field',
          error: err.sqlMessage
        });
      case 'ER_TRUNCATED_WRONG_VALUE': // Invalid data format (1366)
      case 'ER_WRONG_VALUE': // Invalid data format (1525)
        return res.status(400).json({
          success: false,
          message: 'Invalid data format',
          error: err.sqlMessage
        });
      case 'ER_DATA_TOO_LONG': // Data too long for column (1406)
        return res.status(400).json({
          success: false,
          message: 'Data too long',
          error: err.sqlMessage
        });
      case 'ER_BAD_FIELD_ERROR': // Unknown column (1054)
        return res.status(400).json({
          success: false,
          message: 'Unknown column',
          error: err.sqlMessage
        });
      case 'ER_NO_SUCH_TABLE': // Table doesn't exist (1146)
        return res.status(500).json({
          success: false,
          message: 'Database table not found',
          error: err.sqlMessage
        });
    }
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
