const bcrypt = require('bcrypt');

/**
 * Generate bcrypt hashes for seed data passwords
 * Run this with: node src/db/generateHashes.js
 */

const seedPasswords = {
  jane: 'Password123!',
  hiro: 'Password123!',
  john: 'Password123!',
  priya: 'Password123!',
  carlos: 'Password123!',
  ava: 'Admin123!'
};

const generateHashes = async () => {
  console.log('Generating bcrypt hashes for seed data...\n');
  console.log('Use these credentials to log in:');
  console.log('='.repeat(60));

  for (const [name, password] of Object.entries(seedPasswords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`  Email: ${name}.${name === 'ava' ? 'admin' : (name === 'jane' || name === 'hiro') ? 'client' : 'freelancer'}@example.com`);
    console.log(`  Password: ${password}`);
    console.log(`  Hash: '${hash}'`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\nCopy the hashes above into src/db/seed.js');
};

generateHashes().catch(console.error);
