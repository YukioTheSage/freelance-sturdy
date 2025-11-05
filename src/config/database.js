const { Pool } = require('pg');
require('dotenv').config();

// TEMPORARY HARDCODED CONFIG - FOR TESTING ONLY!
// WARNING: Never commit real credentials to production!
console.log('🔧 Using hardcoded database credentials (TEMP ONLY!)');

// Create a PostgreSQL connection pool with explicit parameters
// Using individual params instead of connection string to force IPv4
const pool = new Pool({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  port: 6543, // Transaction pooling port
  database: 'postgres',
  user: 'postgres.czzkdcukjqpmeipkadgt',
  password: 'd4ugk19lZ17p1XA6',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Force IPv4 family to avoid IPv6 issues
  family: 4,
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
