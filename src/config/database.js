const { Pool } = require('pg');
require('dotenv').config();

// TEMPORARY HARDCODED CONFIG - FOR TESTING ONLY!
// WARNING: Never commit real credentials to production!
const HARDCODED_POSTGRES_URL = 'postgresql://postgres.czzkdcukjqpmeipkadgt:d4ugk19lZ17p1XA6@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';
// Debug: Log which connection method is being used
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || HARDCODED_POSTGRES_URL;
console.log('Database connection mode: Connection String (hardcoded fallback)');
console.log('Using connection string (first 30 chars):', connectionString.substring(0, 30) + '...');

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
