# Freelancing Platform API

A secure RESTful API for a freelancing platform built with Node.js, Express, and MySQL using raw SQL queries with Docker support.

## 🔐 Security Features (New!)

This application now includes **production-ready authentication and authorization**:

- ✅ **Secure Password Storage** - Bcrypt hashing with salt
- ✅ **JWT Authentication** - Access tokens + refresh tokens
- ✅ **Role-Based Access Control** - Freelancer, Client, Admin roles
- ✅ **Ownership Verification** - Users can only modify their own resources
- ✅ **Input Validation** - Comprehensive validation on all endpoints
- ✅ **Rate Limiting** - Protection against brute force attacks
- ✅ **Automatic Token Refresh** - Seamless authentication experience

**📚 Documentation:**

- [Security Implementation Guide](./SECURITY_IMPLEMENTATION.md)
- [Authentication Analysis](./AUTHENTICATION_ANALYSIS.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

## Features

### Backend API

- **Authentication & Authorization** (JWT-based)
- User management (freelancers, clients, admins)
- Project posting and management
- Proposal submission system
- Contract and milestone tracking
- Escrow and payment handling
- Messaging system
- Review and rating system
- Dispute resolution

### Frontend UI (React)

- Secure user authentication (Login/Register with password validation)
- Browse and filter projects
- Submit and manage proposals (Freelancers)
- Create and manage projects (Clients)
- Review and accept/reject proposals (Clients)
- Profile management
- Responsive design
- Automatic token refresh

## Tech Stack

### Backend

- **Runtime**: Node.js 18
- **Framework**: Express.js 5
- **Database**: MySQL 8.0
- **Query Method**: Raw SQL (using `mysql2` library)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit
- **Containerization**: Docker & Docker Compose

### Frontend

- **Library**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: Vanilla CSS

## Prerequisites

### Option 1: With Docker (Recommended)

- Docker
- Docker Compose

### Option 2: Without Docker

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation & Setup

### Quick Start with Docker (Recommended)

1. **Clone or navigate to the project:**

```bash
cd c:\Rangsit\dbms
```

2. **Create environment file:**

```bash
copy .env.example .env
```

3. **Start all services:**

```bash
docker-compose up
```

The API will be available at `http://localhost:3000` and MySQL at `localhost:3306`.

### Manual Setup (Without Docker)

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
copy .env.example .env
```

Edit `.env` with your database credentials:

```env
PORT=3000
NODE_ENV=development

DB_USER=freelance_user
DB_HOST=localhost
DB_NAME=freelance_platform
DB_PASSWORD=root123
DB_PORT=3306
```

3. **Create the database:**

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE freelance_platform;
exit
```

4. **Run the schema:**

```bash
mysql -u root -p freelance_platform < src/db/schema.sql
```

5. **(Optional) Seed the database:**

```bash
# Using the Node.js seed script (resets sample data)
npm run seed

# Or run the SQL file manually
mysql -u root -p freelance_platform < src/db/seed.sql
```

## Running the Application

### With Docker

```bash
# Start all services (MySQL + App)
docker-compose up

# Start in detached mode
docker-compose up -d

# Start only MySQL (run app locally)
docker-compose up mysql

# Stop services
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

### Without Docker

#### Development mode (with auto-reload):

```bash
npm run dev
```

#### Production mode:

```bash
npm start
```

The API will be available at `http://localhost:3000`

### Frontend React UI

The project includes a React frontend in the [client/](client/) directory.

1. Navigate to the client directory:

```bash
cd client
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

4. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

For detailed frontend documentation, see [client/README.md](client/README.md)

## API Endpoints

### Health Check

- `GET /api/health` - Check API status

### Users

- `GET /api/users` - Get all users (with optional role filter)
- `GET /api/users/:id` - Get user by ID with profile
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Projects

- `GET /api/projects` - Get all projects (with filters)
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Proposals

- `GET /api/proposals` - Get all proposals (with filters)
- `GET /api/proposals/:id` - Get proposal by ID
- `POST /api/proposals` - Submit new proposal
- `PATCH /api/proposals/:id` - Update proposal
- `DELETE /api/proposals/:id` - Delete proposal

## Example Requests

### Create a User (Freelancer)

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "hashed_password",
    "role": "freelancer",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "country": "USA",
    "profile": {
      "bio": "Full-stack developer",
      "hourly_rate": 50.00,
      "experience_years": 5,
      "headline": "Expert in React and Node.js"
    }
  }'
```

### Create a Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-uuid-here",
    "title": "Build a Web Application",
    "description": "Need a full-stack developer for a web app",
    "project_type": "fixed",
    "budget_min": 1000,
    "budget_max": 5000,
    "currency": "USD",
    "skill_ids": ["skill-uuid-1", "skill-uuid-2"]
  }'
```

### Submit a Proposal

```bash
curl -X POST http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "project-uuid-here",
    "freelancer_id": "freelancer-uuid-here",
    "bid_amount": 3000,
    "estimated_hours": 60,
    "cover_letter": "I am the perfect fit for this project..."
  }'
```

### Get Projects with Filters

```bash
curl "http://localhost:3000/api/projects?status=open&project_type=fixed&limit=10"
```

## Database Schema

The database consists of the following main tables:

- **users** - Base user information
- **freelancer_profiles** - Freelancer-specific data
- **client_profiles** - Client-specific data
- **skills** - Available skills
- **freelancer_skills** - Junction table for freelancer skills
- **projects** - Project listings
- **project_skills** - Junction table for project required skills
- **proposals** - Freelancer proposals
- **contracts** - Active contracts
- **milestones** - Contract milestones
- **escrows** - Escrow accounts
- **payments** - Payment transactions
- **reviews** - User reviews
- **message_threads** - Message threads
- **messages** - Individual messages
- **disputes** - Dispute cases

Full schema is available in [src/db/schema.sql](src/db/schema.sql)

## Project Structure

```
dbms/
├── src/                           # Backend source code
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── db/
│   │   ├── schema.sql            # Database schema
│   │   ├── seed.sql              # Sample data
│   │   └── queries.js            # Query utilities
│   ├── routes/
│   │   ├── users.js              # User endpoints
│   │   ├── projects.js           # Project endpoints
│   │   ├── proposals.js          # Proposal endpoints
│   │   └── index.js              # Route aggregator
│   ├── middleware/
│   │   └── errorHandler.js       # Error handling
│   └── server.js                 # Express app
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/           # Reusable components
│   │   ├── context/              # React Context
│   │   ├── pages/                # Page components
│   │   ├── services/             # API integration
│   │   ├── App.jsx               # Main app component
│   │   ├── index.jsx             # Entry point
│   │   └── index.css             # Global styles
│   ├── index.html                # HTML template
│   ├── vite.config.js            # Vite configuration
│   ├── package.json              # Frontend dependencies
│   └── README.md                 # Frontend documentation
├── .env.example                   # Backend environment template
├── .gitignore
├── package.json                   # Backend dependencies
└── README.md                      # This file
```

## Using Raw SQL Queries

This project uses raw SQL queries exclusively with MySQL. Example from the codebase:

```javascript
const { query } = require("../db/queries");

// Simple query (using ? placeholders)
const result = await query("SELECT * FROM users WHERE email = ?", [email]);

// Complex query with joins
const projects = await query(
  `
  SELECT p.*, c.company_name, CONCAT(u.first_name, ' ', u.last_name) as client_name
  FROM projects p
  JOIN client_profiles c ON p.client_id = c.id
  JOIN users u ON c.user_id = u.id
  WHERE p.status = ?
  ORDER BY p.posted_at DESC
`,
  ["open"]
);

// Transaction example
const { transaction } = require("../db/queries");

await transaction(async (connection) => {
  await connection.query("INSERT INTO users ...");
  await connection.query("INSERT INTO freelancer_profiles ...");
});
```

## Error Handling

The API uses a global error handler that catches:

- Database constraint violations
- Foreign key violations
- Invalid data formats
- Not found errors
- Server errors

All errors return a JSON response with the format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (in development mode)"
}
```

## Development Tips

1. Use Postman or similar tool to test API endpoints
2. Check MySQL logs for query debugging: `docker-compose logs mysql`
3. Use transactions for operations that modify multiple tables
4. Always use parameterized queries (`?` placeholders) to prevent SQL injection
5. Add indexes for frequently queried columns
6. Access MySQL CLI: `docker-compose exec mysql mysql -u root -p freelance_platform`
7. Reset database: `docker-compose down -v && docker-compose up`

## TODO / Future Enhancements

- [ ] Add authentication (JWT)
- [ ] Add authorization middleware
- [ ] Implement pagination helpers
- [ ] Add input validation (express-validator)
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add unit and integration tests
- [ ] Implement rate limiting
- [ ] Add file upload for attachments
- [ ] Add real-time messaging (WebSocket)
- [ ] Add search functionality
- [ ] Add email notifications

## License

ISC
