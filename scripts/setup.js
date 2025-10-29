/**
 * Setup Script for Freelancing Platform
 * Generates secure JWT secrets and helps configure environment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}

async function setup() {
  console.log('\n🔐 Freelancing Platform - Security Setup\n');
  console.log('This script will help you set up your environment variables.\n');

  // Check if .env exists
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Please provide the following information:\n');

  // Database configuration
  const dbHost = await question('Database Host (localhost): ') || 'localhost';
  const dbPort = await question('Database Port (3306): ') || '3306';
  const dbUser = await question('Database User (root): ') || 'root';
  const dbPassword = await question('Database Password: ');
  const dbName = await question('Database Name (freelancing_platform): ') || 'freelancing_platform';

  // Server configuration
  const port = await question('Server Port (3000): ') || '3000';
  const clientUrl = await question('Client URL (http://localhost:5173): ') || 'http://localhost:5173';

  // Generate JWT secrets
  console.log('\n🔑 Generating secure JWT secrets...');
  const jwtSecret = generateSecret();
  const jwtRefreshSecret = generateSecret();
  console.log('✅ Secrets generated!\n');

  // JWT expiration
  const jwtExpires = await question('Access Token Expiration (15m): ') || '15m';
  const jwtRefreshExpires = await question('Refresh Token Expiration (7d): ') || '7d';

  // Create .env content
  const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
DB_NAME=${dbName}

# JWT Configuration
# IMPORTANT: Keep these secrets safe! Do not commit to version control!
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_EXPIRES_IN=${jwtExpires}
JWT_REFRESH_EXPIRES_IN=${jwtRefreshExpires}

# Client URL (for CORS)
CLIENT_URL=${clientUrl}

# Email Configuration (for future email verification)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM=noreply@freelancing-platform.com
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ .env file created successfully!');

  // Create .gitignore if it doesn't exist
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '.env\nnode_modules/\n.DS_Store\n');
    console.log('✅ .gitignore file created');
  } else {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('.env')) {
      fs.appendFileSync(gitignorePath, '\n.env\n');
      console.log('✅ Added .env to .gitignore');
    }
  }

  console.log('\n📋 Next Steps:\n');
  console.log('1. Review the .env file and make any necessary adjustments');
  console.log('2. Create the database if it doesn\'t exist:');
  console.log(`   mysql -u ${dbUser} -p -e "CREATE DATABASE IF NOT EXISTS ${dbName}"`);
  console.log('3. Run database migrations:');
  console.log('   npm run seed');
  console.log('4. Start the server:');
  console.log('   npm run dev');
  console.log('\n🎉 Setup complete!\n');

  rl.close();
}

// Run setup
setup().catch((error) => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});
