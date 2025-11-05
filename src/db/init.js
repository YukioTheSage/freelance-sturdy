/**
 * Database Initialization Script
 * Creates the database schema from schema.sql
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const initDb = async () => {
  const dbName = process.env.DB_NAME || 'freelance_platform';

  // First, connect to default 'postgres' database to create our database
  const defaultClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root123',
    port: process.env.DB_PORT || 5432,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await defaultClient.connect();
    console.log('Connected to PostgreSQL server');

    // Create database if it doesn't exist
    try {
      await defaultClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created`);
    } catch (err) {
      if (err.code === '42P04') { // database_already_exists
        console.log(`⚠️  Database '${dbName}' already exists, continuing...`);
      } else {
        throw err;
      }
    }

    await defaultClient.end();

    // Now connect to our newly created database
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'root123',
      port: process.env.DB_PORT || 5432,
      database: dbName
    });

    await client.connect();
    console.log(`Connected to database '${dbName}'`);

    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL statements by semicolon and filter out empty/comment lines
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt && !stmt.startsWith('--'));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      try {
        await client.query(stmt);
      } catch (err) {
        // Ignore "table already exists" (42P07) and duplicate object (42710) errors
        if (err.code === '42P07' || err.code === '42710') {
          console.log(`⚠️  Skipping (${err.code}): ${err.message}`);
        } else {
          throw err;
        }
      }
    }

    console.log('✅ Database schema initialized successfully!');
    await client.end();
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

initDb()
  .then(() => {
    console.log('Database initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
