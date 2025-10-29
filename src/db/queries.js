const pool = require('../config/database');

/**
 * Execute a raw SQL query
 * @param {string} text - The SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} - Query result with rows and metadata
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const [rows, fields] = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: rows.length });
    // Return in PostgreSQL-like format for compatibility
    return { rows, fields, rowCount: rows.affectedRows || rows.length };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Get a connection from the pool for transactions
 * @returns {Promise<object>} - Database connection
 */
const getClient = async () => {
  const connection = await pool.getConnection();

  // Set a timeout to release connection after 5 seconds of inactivity
  const timeout = setTimeout(() => {
    console.error('A connection has been checked out for more than 5 seconds!');
  }, 5000);

  const originalRelease = connection.release.bind(connection);
  const originalQuery = connection.query.bind(connection);

  // Wrap query to return PostgreSQL-like format
  const wrappedQuery = async (text, params = []) => {
    const [rows, fields] = await originalQuery(text, params);
    return { rows, fields, rowCount: rows.affectedRows || rows.length };
  };

  // Wrap release to clear timeout
  connection.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };

  // Add wrapped query method
  connection.query = wrappedQuery;

  return connection;
};

/**
 * Execute queries in a transaction
 * @param {Function} callback - Async function that receives connection
 * @returns {Promise<any>} - Result of the callback
 */
const transaction = async (callback) => {
  const connection = await getClient();
  try {
    await connection.query('START TRANSACTION', []);
    const result = await callback(connection);
    await connection.query('COMMIT', []);
    return result;
  } catch (error) {
    await connection.query('ROLLBACK', []);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  query,
  getClient,
  transaction,
};
