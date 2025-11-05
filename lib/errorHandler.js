/**
 * Global error handler middleware for PostgreSQL
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL database errors (SQLSTATE codes)
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry',
          error: err.message || err.detail
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          message: 'Invalid reference',
          error: err.message || err.detail
        });
      case '23502': // not_null_violation
        return res.status(400).json({
          success: false,
          message: 'Missing required field',
          error: err.message || err.detail
        });
      case '22P02': // invalid_text_representation
      case '22007': // invalid_datetime_format
      case '22003': // numeric_value_out_of_range
        return res.status(400).json({
          success: false,
          message: 'Invalid data format',
          error: err.message || err.detail
        });
      case '22001': // string_data_right_truncation
        return res.status(400).json({
          success: false,
          message: 'Data too long',
          error: err.message || err.detail
        });
      case '42703': // undefined_column
        return res.status(400).json({
          success: false,
          message: 'Unknown column',
          error: err.message || err.detail
        });
      case '42P01': // undefined_table
        return res.status(500).json({
          success: false,
          message: 'Database table not found',
          error: err.message || err.detail
        });
      case '23514': // check_violation
        return res.status(400).json({
          success: false,
          message: 'Value violates constraint',
          error: err.message || err.detail
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
