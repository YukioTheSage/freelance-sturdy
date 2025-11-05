const { Pool } = require('pg');
require('dotenv').config();

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'freelance_platform',
  port: process.env.DB_PORT || 5432,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
    process.exit(-1);
  }
  if (client) {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on PostgreSQL pool', err);
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
  }
  if (err.code === '53300') {
    console.error('Database has too many connections.');
  }
});

module.exports = pool;
