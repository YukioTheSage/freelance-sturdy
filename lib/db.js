const { Pool } = require('pg');

/**
 * Serverless-compatible PostgreSQL connection
 * Uses singleton pattern to reuse connection pool across function invocations
 */

let pool;

/**
 * Get or create a PostgreSQL connection pool optimized for serverless
 */
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
      // Serverless-optimized settings
      max: 1, // Limit connections in serverless environment
      idleTimeoutMillis: 10000, // Close idle connections quickly
      connectionTimeoutMillis: 3000,
      // For development fallback
      ...(process.env.DB_HOST && {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '5432'),
      }),
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on PostgreSQL pool', err);
      pool = null; // Reset pool on error
    });
  }

  return pool;
};

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
const query = async (text, params = []) => {
  const start = Date.now();
  const pool = getPool();

  try {
    // Convert MySQL-style ? to PostgreSQL-style $1, $2, $3
    const pgQuery = convertPlaceholders(text);
    const result = await pool.query(pgQuery, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: pgQuery, duration, rows: result.rowCount });
    }

    return { rows: result.rows, fields: result.fields, rowCount: result.rowCount };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<object>} - Database client
 */
const getClient = async () => {
  const pool = getPool();
  const client = await pool.connect();

  const originalRelease = client.release.bind(client);
  const originalQuery = client.query.bind(client);

  // Wrap query to return consistent format
  const wrappedQuery = async (text, params = []) => {
    const pgQuery = convertPlaceholders(text);
    const result = await originalQuery(pgQuery, params);
    return { rows: result.rows, fields: result.fields, rowCount: result.rowCount };
  };

  // Override query method
  client.query = wrappedQuery;
  client.release = originalRelease;

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

/**
 * Close the pool (useful for graceful shutdown, not typically needed in serverless)
 */
const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = {
  query,
  getClient,
  transaction,
  closePool,
};
