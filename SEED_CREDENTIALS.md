# Seed Database Test Credentials

After running the seed script, use these credentials to log in:

## Client Accounts

### Jane Smith (Verified Client)
- **Email:** `jane.client@example.com`
- **Password:** `Password123!`
- **Role:** Client
- **Company:** Bright Pixel Labs
- **Projects:** React Dashboard Revamp (open)

### Hiro Tanaka (Verified Client)
- **Email:** `hiro.client@example.com`
- **Password:** `Password123!`
- **Role:** Client
- **Company:** Sakura Commerce
- **Projects:** E-commerce API Modernisation (in_progress)

---

## Freelancer Accounts

### John Doe (Verified Freelancer)
- **Email:** `john.freelancer@example.com`
- **Password:** `Password123!`
- **Role:** Freelancer
- **Skills:** JavaScript, React, Node.js
- **Hourly Rate:** $65/hour
- **Active Contracts:** React Dashboard project with Jane

### Priya Patel (Verified Freelancer)
- **Email:** `priya.freelancer@example.com`
- **Password:** `Password123!`
- **Role:** Freelancer
- **Skills:** Node.js, Python, MySQL
- **Hourly Rate:** $55/hour
- **Active Contracts:** E-commerce API project with Hiro

### Carlos Mendez (Unverified Freelancer)
- **Email:** `carlos.freelancer@example.com`
- **Password:** `Password123!`
- **Role:** Freelancer
- **Skills:** UI/UX Design, React
- **Hourly Rate:** $45/hour
- **Status:** ⚠️ Not verified (is_verified = false)

---

## Admin Account

### Ava Wong (Admin)
- **Email:** `ava.admin@example.com`
- **Password:** `Admin123!`
- **Role:** Admin
- **Permissions:** Full access to all resources

---

## Reseed Database

To apply these credentials:

```bash
# Using Docker
docker-compose down -v
docker-compose up

# Or manually
node src/db/seed.js
```

---

## Password Security

All passwords are hashed with bcrypt (cost factor: 10). The seed file contains actual bcrypt hashes, not plain text passwords.

**Never use these credentials in production environments.**
