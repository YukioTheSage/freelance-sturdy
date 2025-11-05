# Vercel Deployment Guide

This guide covers deploying the Freelancing Platform to Vercel with serverless functions and a managed PostgreSQL database.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Connect your repository to Vercel
3. **PostgreSQL Database**: Choose a managed PostgreSQL provider:
   - [Neon](https://neon.tech) - Recommended, serverless PostgreSQL
   - [Supabase](https://supabase.com) - PostgreSQL with additional features
   - [Railway](https://railway.app) - Simple PostgreSQL hosting
   - [AWS RDS](https://aws.amazon.com/rds/) - Enterprise option

## Architecture Overview

The application is deployed as two separate Vercel projects:

1. **API Backend** (serverless functions in `/api` directory)
2. **React Frontend** (static site in `/client` directory)

## Part 1: Database Setup

### Option A: Using Neon (Recommended)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up and create a new project
   - Name it: `freelance-platform-db`

2. **Get Connection String**
   - Copy the connection string from the dashboard
   - Format: `postgresql://user:password@host/database?sslmode=require`
   - Save this for later

3. **Initialize Database Schema**
   ```bash
   # Install PostgreSQL client (if not already installed)
   # On Windows: Download from postgresql.org
   # On Mac: brew install postgresql
   # On Linux: sudo apt-get install postgresql-client

   # Connect to your Neon database
   psql "your-connection-string-here"

   # Run schema file
   \i src/db/schema.sql

   # Optional: Run seed data
   \i src/db/seed.sql

   # Exit
   \q
   ```

### Option B: Using Supabase

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project: `freelance-platform`

2. **Get Connection Details**
   - Go to Project Settings > Database
   - Copy the connection string (URI format)
   - Use "Connection pooling" string for serverless

3. **Run Schema**
   - Use the SQL Editor in Supabase dashboard
   - Copy and paste contents of `src/db/schema.sql`
   - Execute the SQL
   - Optionally run `src/db/seed.sql`

## Part 2: Backend API Deployment

### Step 1: Prepare Environment Variables

Create a `.env.production` file locally (do NOT commit this):

```env
# Database (use your managed PostgreSQL connection string)
POSTGRES_URL=postgresql://user:password@host:5432/database?sslmode=require

# JWT Secrets (generate new ones for production!)
JWT_SECRET=<generate-with-crypto-randomBytes-64>
JWT_REFRESH_SECRET=<generate-with-crypto-randomBytes-64>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=production

# Client URL (will be updated after frontend deployment)
CLIENT_URL=https://your-frontend-url.vercel.app
```

**Generate JWT Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run this twice to generate both secrets
```

### Step 2: Deploy to Vercel

**Method 1: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from root directory
vercel --prod

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - What's your project's name? freelance-platform-api
# - In which directory is your code located? ./
```

**Method 2: Using Vercel Dashboard**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root)
   - **Build Command**: (leave empty, no build needed for serverless functions)
   - **Output Directory**: (leave empty)

### Step 3: Configure Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add all variables from your `.env.production`:
   - `POSTGRES_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `JWT_EXPIRES_IN`
   - `JWT_REFRESH_EXPIRES_IN`
   - `NODE_ENV` = `production`
   - `CLIENT_URL` (update after frontend deployment)

4. Click **Save** for each variable

### Step 4: Test the API

1. Get your API URL from Vercel (e.g., `https://freelance-platform-api.vercel.app`)
2. Test health endpoint:
   ```bash
   curl https://your-api-url.vercel.app/api/health
   ```
3. Expected response:
   ```json
   {
     "success": true,
     "message": "API is running",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "database": "connected"
   }
   ```

## Part 3: Frontend Deployment

### Step 1: Update Environment Variables

Create `client/.env.production`:

```env
VITE_API_URL=https://your-api-url.vercel.app/api
```

Replace `your-api-url` with the actual API URL from Step 2.

### Step 2: Deploy Frontend

**Method 1: Using Vercel CLI**

```bash
# Navigate to client directory
cd client

# Deploy
vercel --prod

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - What's your project's name? freelance-platform-client
# - In which directory is your code located? ./
```

**Method 2: Using Vercel Dashboard**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository again
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Configure Frontend Environment Variables

1. Go to frontend project in Vercel
2. **Settings** > **Environment Variables**
3. Add:
   - `VITE_API_URL` = `https://your-api-url.vercel.app/api`
4. Redeploy to apply changes

### Step 4: Update CORS Settings

1. Go back to your API project in Vercel
2. Update `CLIENT_URL` environment variable:
   - `CLIENT_URL` = `https://your-frontend-url.vercel.app`
3. Redeploy API to apply CORS changes

## Part 4: Verification

### Test Complete Flow

1. **Visit Frontend**
   - Navigate to `https://your-frontend-url.vercel.app`

2. **Test Registration**
   - Register a new user
   - Verify JWT tokens are received

3. **Test Authentication**
   - Login with credentials
   - Verify protected routes work

4. **Test API Endpoints**
   ```bash
   # Register
   curl -X POST https://your-api-url.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234",
       "role": "freelancer"
     }'

   # Login
   curl -X POST https://your-api-url.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234"
     }'
   ```

## Part 5: Custom Domain (Optional)

### For API

1. Go to API project > **Settings** > **Domains**
2. Add your domain (e.g., `api.yoursite.com`)
3. Configure DNS as instructed by Vercel
4. Update `CLIENT_URL` to use custom domain

### For Frontend

1. Go to frontend project > **Settings** > **Domains**
2. Add your domain (e.g., `www.yoursite.com`)
3. Configure DNS as instructed
4. Update `VITE_API_URL` in frontend if API has custom domain

## Part 6: Monitoring and Maintenance

### View Logs

1. **Vercel Dashboard** > Your Project > **Logs**
2. Real-time function invocation logs
3. Filter by function, time, or status

### Database Management

**Using Neon:**
- Dashboard: [console.neon.tech](https://console.neon.tech)
- Monitor queries, connections, and storage

**Using Supabase:**
- Dashboard: [app.supabase.com](https://app.supabase.com)
- SQL Editor, Table Editor, logs

### Performance Monitoring

1. Check Vercel Analytics (if enabled)
2. Monitor function execution times
3. Check database query performance
4. Set up alerts for errors

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```
Error: connection refused / timeout
```
**Solution:**
- Verify `POSTGRES_URL` is correct
- Ensure database allows connections from Vercel IPs
- Check if SSL mode is required: add `?sslmode=require` to connection string

**2. JWT Token Errors**
```
Error: invalid token / token expired
```
**Solution:**
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set correctly
- Check token expiration settings
- Clear browser localStorage and try again

**3. CORS Errors**
```
Access to fetch blocked by CORS policy
```
**Solution:**
- Verify `CLIENT_URL` in API environment variables
- Ensure it matches your frontend URL exactly
- Redeploy API after updating

**4. Function Timeout**
```
Error: Function execution timeout
```
**Solution:**
- Optimize database queries
- Use connection pooling properly
- Consider upgrading Vercel plan for longer timeouts

**5. Cold Start Issues**
- First request may be slow due to serverless cold start
- Subsequent requests will be faster
- Consider using Vercel Edge Functions for faster response

### Getting Help

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Vercel Discord**: [vercel.com/discord](https://vercel.com/discord)
- **Documentation**: [vercel.com/docs](https://vercel.com/docs)

## Environment Variables Reference

### Backend (API)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `POSTGRES_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` | Yes |
| `JWT_SECRET` | JWT access token secret | 64-char hex string | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | 64-char hex string | Yes |
| `JWT_EXPIRES_IN` | Access token expiration | `15m` | No (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` | No (default: 7d) |
| `NODE_ENV` | Environment | `production` | Yes |
| `CLIENT_URL` | Frontend URL for CORS | `https://app.vercel.app` | Yes |

### Frontend (Client)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `https://api.vercel.app/api` | Yes |

## Rate Limiting (Important Note)

The original Express application used `express-rate-limit` for auth endpoints. In serverless, this requires external storage:

**Option 1: Use Upstash Redis**
1. Create free account at [upstash.com](https://upstash.com)
2. Create Redis database
3. Install: `npm install @upstash/ratelimit @upstash/redis`
4. Update auth endpoints to use Upstash

**Option 2: Use Vercel Edge Config**
1. Available on Pro plans
2. Lower latency for rate limiting

**Option 3: Use Vercel Firewall**
1. Available on Enterprise plans
2. DDoS protection and rate limiting

For MVP deployment, rate limiting is optional but recommended for production.

## Cost Estimates (as of 2024)

### Vercel (Both projects)
- **Hobby Plan**: Free
  - 100 GB bandwidth
  - Unlimited API requests
  - Serverless function execution
- **Pro Plan**: $20/month
  - Better performance
  - More bandwidth
  - Advanced analytics

### Database
- **Neon**: Free tier available
  - 0.5 GB storage
  - Paid plans start at $19/month
- **Supabase**: Free tier available
  - 500 MB storage
  - Paid plans start at $25/month

## Next Steps

1. ✅ Deploy API to Vercel
2. ✅ Deploy Frontend to Vercel
3. ⚠️ Set up rate limiting (optional, recommended)
4. ⚠️ Configure custom domains (optional)
5. ⚠️ Set up monitoring and alerts
6. ⚠️ Enable Vercel Analytics (optional)
7. ⚠️ Implement email verification (future enhancement)

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
