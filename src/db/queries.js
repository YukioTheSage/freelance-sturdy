const pool = require('../config/database');

/**
 * Convert MySQL-style ? placeholders to PostgreSQL-style $1, $2, $3
 * @param {string} text - SQL query with ? placeholders
 * @returns {string} - SQL query with $n placeholders
 */
const convertPlaceholders = (text) => {
  let index = 0;
  return text.replace(/\?/g, () => `$${++index}`);
};

/**
 * Execute a raw SQL query
 * @param {string} text - The SQL query (can use ? or $1, $2, etc.)
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} - Query result with rows and metadata
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    // Convert MySQL-style ? to PostgreSQL-style $1, $2, $3
    const pgQuery = convertPlaceholders(text);
    const result = await pool.query(pgQuery, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: pgQuery, duration, rows: result.rowCount });
    // PostgreSQL pg library already returns {rows, fields, rowCount}
    return { rows: result.rows, fields: result.fields, rowCount: result.rowCount };
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
  const client = await pool.connect();

  // Set a timeout to release connection after 5 seconds of inactivity
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  const originalRelease = client.release.bind(client);
  const originalQuery = client.query.bind(client);

  // Wrap query to return consistent format
  const wrappedQuery = async (text, params = []) => {
    const pgQuery = convertPlaceholders(text);
    const result = await originalQuery(pgQuery, params);
    return { rows: result.rows, fields: result.fields, rowCount: result.rowCount };
  };

  // Wrap release to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };

  // Add wrapped query method
  client.query = wrappedQuery;

  return client;
};

/**
 * Execute queries in a transaction
 * @param {Function} callback - Async function that receives client
 * @returns {Promise<any>} - Result of the callback
 */
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN', []);
    const result = await callback(client);
    await client.query('COMMIT', []);
    return result;
  } catch (error) {
    await client.query('ROLLBACK', []);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  getClient,
  transaction,
};
