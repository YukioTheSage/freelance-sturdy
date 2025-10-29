/**
 * Database Initialization Script
 * Creates the database schema from schema.sql
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
require('dotenv').config();

const initDb = async () => {
  // Create connection without database selected
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    port: process.env.DB_PORT || 3306
  });

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        reject(err);
        return;
      }

      const dbName = process.env.DB_NAME || 'freelance_platform';

      // Create database if it doesn't exist
      connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Select the database
        connection.query(`USE ${dbName}`, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Read schema.sql
          const schemaPath = path.join(__dirname, 'schema.sql');
          const schema = fs.readFileSync(schemaPath, 'utf8');

          // Split SQL statements by semicolon and filter out empty/comment lines
          const statements = schema
            .split(';')
            .map((stmt) => stmt.trim())
            .filter((stmt) => stmt && !stmt.startsWith('--'));

          let completed = 0;

          const executeNext = () => {
            if (completed >= statements.length) {
              console.log('✅ Database schema initialized successfully!');
              connection.end();
              resolve();
              return;
            }

            const stmt = statements[completed] + ';';
            console.log(`Executing statement ${completed + 1}/${statements.length}...`);

            connection.query(stmt, (err) => {
              if (err) {
                // Ignore "table already exists" errors (1050) and duplicate key errors (1061)
                if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
                  console.log(`⚠️  Skipping (${err.code})`);
                } else {
                  reject(err);
                  return;
                }
              }
              completed++;
              executeNext();
            });
          };

          executeNext();
        });
      });
    });
  });
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
