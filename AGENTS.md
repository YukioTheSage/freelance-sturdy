# CLAUDE.md

This file provides guidance to LLM agents when working with code in this repository.

## Project Overview

A full-stack freelancing platform with Node.js/Express RESTful API backend, MySQL database, and React frontend. The backend exclusively uses raw SQL queries via the `mysql2` library - no ORM is used.

**Key Features:**

- JWT authentication with refresh tokens
- Role-based access control (freelancer, client, admin)
- Input validation with express-validator
- Rate limiting for auth endpoints
- React frontend with Vite

## Essential Commands

### Development with Docker (Recommended)

```bash
# Start all services (MySQL + Node.js app)
docker-compose up

# Start only MySQL (run app locally)
docker-compose up mysql

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

### Development without Docker

**Backend:**

```bash
npm install              # Install dependencies
npm run dev              # Start with auto-reload (nodemon)
npm start                # Start in production mode
npm run init-db          # Initialize database schema
npm run seed             # Seed database with sample data
npm run db:reset         # Reset database (init + seed)
```

**Frontend (in /client directory):**

```bash
cd client
npm install              # Install frontend dependencies
npm run dev              # Start React dev server (port 5173)
npm run build            # Build for production
```

### Database Setup

**Option 1: Using Docker (Recommended)**

```bash
# Start MySQL container (automatically runs schema and seed files)
docker-compose up mysql

# The schema and seed files are automatically loaded on first run
```

**Option 2: Manual MySQL Setup**

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE freelance_platform"

# Run schema (creates tables)
mysql -u root -p freelance_platform < src/db/schema.sql

# Seed data (optional)
mysql -u root -p freelance_platform < src/db/seed.sql
```

### Environment Configuration

**Backend (.env):**
Copy `.env.example` to `.env` and configure:

- Database credentials (use `DB_HOST=mysql` for Docker, `localhost` for local)
- JWT secrets (generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- JWT token expiration times
- Client URL for CORS

**Frontend (client/.env):**
Configure API base URL (typically `http://localhost:3000`)

## Architecture

### Authentication & Authorization

The application uses JWT-based authentication with refresh tokens. All auth logic is in [src/routes/auth.js](src/routes/auth.js) and [src/middleware/auth.js](src/middleware/auth.js).

**Auth Endpoints:**

- `POST /api/auth/register` - Register new user (rate limited: 3 per hour)
- `POST /api/auth/login` - Login (rate limited: 5 per 15 min)
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Logout and revoke refresh token
- `POST /api/auth/logout-all` - Logout from all devices
- `GET /api/auth/me` - Get current user info (requires authentication)

**Authentication Middleware:**

```javascript
const {
  authenticate,
  authorize,
  verifyOwnership,
  optionalAuth,
} = require("../middleware/auth");

// Require authentication
router.get("/protected", authenticate, handler);

// Require specific role
router.post("/projects", authenticate, authorize("client"), handler);

// Verify user owns resource (admin bypass)
router.patch("/users/:id", authenticate, verifyOwnership(), handler);

// Optional auth (req.user set to null if no token)
router.get("/projects", optionalAuth, handler);
```

**Key Points:**

- Access tokens expire in 15 minutes (configurable via JWT_EXPIRES_IN)
- Refresh tokens expire in 7 days (configurable via JWT_REFRESH_EXPIRES_IN)
- Refresh tokens are stored in database and can be revoked
- Passwords are hashed with bcrypt (10 salt rounds)
- Rate limiting on login/register prevents brute force attacks
- Authorization middleware supports role-based access control

### Validation

Input validation uses express-validator. See [src/middleware/validate.js](src/middleware/validate.js).

**Pattern for adding validation:**

```javascript
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validate");

router.post(
  "/endpoint",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
  ],
  validate, // Must come after validators, before handler
  handler
);
```

**Validation error response format:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email", "value": "bad-email" }
  ]
}
```

### Database Query Pattern

All database operations use the query utilities in [src/db/queries.js](src/db/queries.js).

**Query results format:** All queries return PostgreSQL-like format: `{ rows, fields, rowCount }`

**Simple queries:**

```javascript
const { query } = require("../db/queries");
const result = await query("SELECT * FROM users WHERE email = ?", [email]);
```

**Transactions:**

```javascript
const { transaction } = require("../db/queries");
const result = await transaction(async (connection) => {
  await connection.query("INSERT INTO users ...");
  await connection.query("INSERT INTO freelancer_profiles ...");
  return someValue;
});
```

Always use parameterized queries (`?` placeholders) to prevent SQL injection.

### Route Structure

Routes are organized by resource in [src/routes/](src/routes/):

- Each route file exports an Express router
- All routes are mounted under `/api` prefix via [src/routes/index.js](src/routes/index.js)
- Route handlers use async/await and pass errors to Express error handler via `next(error)`

**Standard route handler pattern:**

```javascript
router.get("/:id", async (req, res, next) => {
  try {
    const result = await query("SELECT ...", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error); // Pass to global error handler
  }
});
```

### Error Handling

Global error handler in [src/middleware/errorHandler.js](src/middleware/errorHandler.js) handles MySQL errors:

- `ER_DUP_ENTRY` - Unique constraint violation (409 Conflict)
- `ER_NO_REFERENCED_ROW_2` / `ER_ROW_IS_REFERENCED_2` - Foreign key violation (400 Bad Request)
- `ER_BAD_NULL_ERROR` - NOT NULL violation (400 Bad Request)
- `ER_TRUNCATED_WRONG_VALUE` - Invalid data format (400 Bad Request)
- `ER_DATA_TOO_LONG` - Data too long (400 Bad Request)

Always use `next(error)` in route handlers to trigger this middleware.

### Database Schema Key Points

Located in [src/db/schema.sql](src/db/schema.sql):

- **UUIDs**: All IDs are CHAR(36) UUIDs generated via `UUID()` function
- **Role-based profiles**: Users have a `role` field ('freelancer', 'client', 'admin'), with separate `freelancer_profiles` and `client_profiles` tables
- **Authentication tables**: `users` stores password_hash; `refresh_tokens` tracks active refresh tokens with revocation support
- **Cascading deletes**: Most foreign keys use `ON DELETE CASCADE`
- **JSON fields**: Used for flexible data like `availability` in freelancer profiles
- **Junction tables**: Many-to-many relationships use junction tables (e.g., `freelancer_skills`, `project_skills`)
- **MySQL 8.0+**: Requires MySQL 8.0 or higher for CHECK constraints and improved UUID support

### Creating New Routes

When adding new resource endpoints:

1. Create a new router file in [src/routes/](src/routes/)
2. Import and mount in [src/routes/index.js](src/routes/index.js)
3. Add authentication/authorization middleware as needed
4. Add validation middleware for input validation
5. Use the standard async/await + error forwarding pattern
6. Return consistent response format: `{ success: boolean, data?: any, message?: string }`

**Example with auth and validation:**

```javascript
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

router.post('/',
  authenticate,                          // Require authentication
  authorize('client'),                   // Require specific role
  [body('title').notEmpty()],           // Validation rules
  validate,                              // Validation middleware
  async (req, res, next) => {           // Route handler
    try {
      // Access authenticated user via req.user
      const result = await query('INSERT INTO ...', [...]);
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);
```

### Database Queries Best Practices

1. **Use COALESCE or IFNULL for partial updates:**

   ```javascript
   UPDATE users SET first_name = COALESCE(?, first_name) WHERE id = ?
   ```

2. **Check rows.length for existence:**

   ```javascript
   const result = await query("SELECT ...", [id]);
   if (result.rows.length === 0) {
     return res.status(404).json({ success: false, message: "Not found" });
   }
   ```

3. **Use LAST_INSERT_ID() for new records:**

   ```javascript
   const result = await query("INSERT INTO users (...) VALUES (...)", [values]);
   const insertId = result.rows.insertId;
   ```

4. **Use transactions for multi-table operations:**
   Any operation that creates/updates multiple related records should use the `transaction()` utility.

## Server Configuration

**Backend Express app** in [src/server.js](src/server.js) uses:

- **helmet** - Security headers
- **cors** - CORS support (configured via CLIENT_URL env variable)
- **morgan** - Request logging in 'dev' format
- **express.json()** - JSON body parsing
- **express.urlencoded()** - URL-encoded body parsing
- **cookie-parser** - Parse cookies for future use
- **express-rate-limit** - Rate limiting on auth routes

**Database connection pool** in [src/config/database.js](src/config/database.js):

- Max 20 connections (connectionLimit)
- Wait for connections enabled
- Keep-alive enabled

## Frontend Architecture

React application located in [client/](client/) directory:

- **Build tool**: Vite
- **Routing**: React Router v6
- **HTTP client**: Axios with automatic token refresh interceptor
- **State management**: React Context for authentication state
- **Structure**:
  - [client/src/components/](client/src/components/) - Reusable UI components
  - [client/src/pages/](client/src/pages/) - Page components
  - [client/src/context/](client/src/context/) - React Context providers
  - [client/src/services/](client/src/services/) - API integration layer

**Key Features:**

- Automatic JWT token refresh on 401 responses
- Protected routes with authentication checks
- Form validation before API submission
- Responsive design with vanilla CSS

## Adding New Database Tables

1. Add CREATE TABLE statement to [src/db/schema.sql](src/db/schema.sql)
2. Use UUID primary keys: `id CHAR(36) PRIMARY KEY DEFAULT (UUID())`
3. Add foreign key constraints with `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
4. Add CHECK constraints for enum-like columns (requires MySQL 8.0+)
5. Add ENGINE=InnoDB and charset: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
6. Re-run schema file to recreate database:
   - Docker: `docker-compose down -v && docker-compose up mysql`
   - Manual: `mysql -u root -p freelance_platform < src/db/schema.sql`
