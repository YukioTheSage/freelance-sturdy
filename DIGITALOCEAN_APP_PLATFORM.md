# DigitalOcean App Platform Deployment Guide

This guide covers deploying the Freelancing Platform to DigitalOcean App Platform with managed PostgreSQL database.

## Why DigitalOcean App Platform?

✅ **Advantages:**
- Use your **original Express application** (no serverless conversion needed!)
- Managed PostgreSQL database included
- No cold starts (always-on containers)
- Simple pricing ($5-12/month for starter apps)
- Built-in CI/CD from GitHub
- Single platform for frontend + backend + database
- Automatic HTTPS and custom domains
- Easier to debug than serverless

## Prerequisites

1. **DigitalOcean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **GitHub Account**: Your code must be in a GitHub repository
3. **Git Repository**: Push your code to GitHub

## Architecture

Your application will be deployed as:
1. **Backend API** - Node.js service (Express app from `src/`)
2. **Frontend** - Static site (React app from `client/`)
3. **Database** - Managed PostgreSQL database

All in one DigitalOcean project!

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Prepare for DigitalOcean deployment"

# Create repo on GitHub and push
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git push -u origin main
```

### Step 2: Create App on DigitalOcean

#### Option A: Using App Spec File (Recommended)

1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Click **Create App**
3. Select **GitHub** as source
4. Authorize DigitalOcean to access your repository
5. Select your repository and branch (`main`)
6. Choose **"Import from App Spec"**
7. Upload or paste the contents of `.do/app.yaml`
8. Click **Next**

#### Option B: Manual Configuration

1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Click **Create App**
3. Select **GitHub** as source
4. Select your repository and branch

**Configure Backend (API):**
- **Name**: `api`
- **Type**: Web Service
- **Source Directory**: `/` (root)
- **Build Command**: `npm install`
- **Run Command**: `npm start`
- **HTTP Port**: `3000`
- **Routes**: `/api` and `/health`
- **Instance Size**: Basic (512MB RAM, $5/month)

**Configure Frontend:**
- **Name**: `web`
- **Type**: Static Site
- **Source Directory**: `/client`
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `dist`
- **Routes**: `/`

**Add Database:**
- Click **Add Resource** > **Database**
- **Type**: PostgreSQL
- **Name**: `freelance-platform-db`
- **Version**: 15
- **Plan**: Basic ($15/month)

### Step 3: Configure Environment Variables

In the App Platform dashboard, go to your app > **Settings** > **Components** > **api** (backend) > **Environment Variables**:

**Add these variables:**

```env
# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=<your-64-char-hex-secret>
JWT_REFRESH_SECRET=<your-64-char-hex-secret>

# JWT Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3000

# Client URL (will be auto-filled after frontend deploys)
CLIENT_URL=${web.PUBLIC_URL}
```

**Database variables are automatically set by DigitalOcean:**
- `DATABASE_URL` - Full connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Individual values

### Step 4: Configure Frontend Environment

Go to **web** (frontend) > **Environment Variables**:

```env
VITE_API_URL=${api.PUBLIC_URL}/api
```

The `${api.PUBLIC_URL}` variable will automatically point to your backend URL.

### Step 5: Deploy

1. Click **Create Resources** or **Deploy**
2. Wait for deployment (usually 5-10 minutes)
3. DigitalOcean will:
   - Create PostgreSQL database
   - Build and deploy backend
   - Build and deploy frontend
   - Configure networking and HTTPS

### Step 6: Initialize Database Schema

After deployment, you need to run the database schema:

**Method 1: Using Console (Recommended)**

1. Go to your app in DigitalOcean
2. Select **Console** tab for the `api` component
3. Run:
   ```bash
   npm run init-db
   ```

**Method 2: Using doctl CLI**

```bash
# Install doctl
# On Mac: brew install doctl
# On Windows: Download from GitHub releases

# Authenticate
doctl auth init

# Get your app ID
doctl apps list

# Run command in container
doctl apps logs <app-id> --type run

# Or use console access
doctl apps create-deployment <app-id>
```

**Method 3: Using PostgreSQL Client Locally**

```bash
# Get database connection string from DigitalOcean dashboard
# Settings > freelance-platform-db > Connection Details

# Connect and run schema
psql "your-connection-string" < src/db/schema.sql

# Optional: Run seed data
psql "your-connection-string" < src/db/seed.sql
```

### Step 7: Verify Deployment

1. **Get your URLs** from the DigitalOcean dashboard:
   - Frontend: `https://web-xxx.ondigitalocean.app`
   - Backend API: `https://api-xxx.ondigitalocean.app`

2. **Test health endpoint:**
   ```bash
   curl https://api-xxx.ondigitalocean.app/health
   ```

3. **Test registration:**
   ```bash
   curl -X POST https://api-xxx.ondigitalocean.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234",
       "role": "freelancer"
     }'
   ```

4. **Visit frontend:**
   - Open `https://web-xxx.ondigitalocean.app`
   - Register and login
   - Test all features

## Custom Domain (Optional)

### Add Custom Domain to Frontend

1. Go to your app > **Settings** > **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `www.yoursite.com`)
4. Follow DNS configuration instructions
5. DigitalOcean will automatically provision SSL certificate

### Add Custom Domain to API

1. Add another domain for API (e.g., `api.yoursite.com`)
2. Configure DNS as instructed
3. Update `CLIENT_URL` environment variable if needed

### Update Environment Variables

After adding custom domains:

1. Update `CLIENT_URL` in backend to point to your custom frontend domain
2. Frontend `VITE_API_URL` should automatically use the custom API domain
3. Redeploy if needed

## App Spec Configuration

The [.do/app.yaml](.do/app.yaml) file contains your complete app configuration:

```yaml
name: freelance-platform
region: nyc

databases:
  - name: freelance-platform-db
    engine: PG
    version: "15"

services:
  - name: api
    # Backend configuration

static_sites:
  - name: web
    # Frontend configuration
```

You can edit this file and redeploy using:

```bash
# Install doctl CLI
doctl apps create --spec .do/app.yaml

# Or update existing app
doctl apps update <app-id> --spec .do/app.yaml
```

## Monitoring and Logs

### View Logs

**From Dashboard:**
1. Go to your app
2. Select **Runtime Logs** tab
3. Choose component (`api` or `web`)
4. View real-time logs

**Using CLI:**
```bash
# Install doctl
doctl auth init

# View logs
doctl apps logs <app-id> --type run
doctl apps logs <app-id> --type build
doctl apps logs <app-id> --type deploy

# Follow logs (real-time)
doctl apps logs <app-id> --follow
```

### Monitoring

1. **Metrics**: Dashboard shows CPU, memory, and bandwidth usage
2. **Alerts**: Set up alerts for high resource usage
3. **Health Checks**: Automatic health checks on `/health` endpoint

## Scaling

### Vertical Scaling (More Resources)

1. Go to app > **Settings** > **Components** > **api**
2. Change **Instance Size**:
   - Basic XXS: 512MB RAM ($5/month)
   - Basic XS: 1GB RAM ($12/month)
   - Basic S: 2GB RAM ($24/month)
   - Professional: 4-16GB RAM ($50-200/month)

### Horizontal Scaling (More Instances)

1. Go to app > **Settings** > **Components** > **api**
2. Change **Instance Count** (1-20 instances)
3. Load balancing is automatic

### Database Scaling

1. Go to **Databases** > **freelance-platform-db**
2. Upgrade plan:
   - Basic: 1GB RAM ($15/month)
   - Professional: 2-64GB RAM ($30-580/month)

## Automatic Deployments

**Enabled by default!**

Every time you push to your GitHub `main` branch:
1. DigitalOcean detects the push
2. Rebuilds and redeploys your app
3. Zero-downtime deployment

**To disable:**
- Go to **Settings** > **App-Level Configuration**
- Uncheck **Auto Deploy**

## Rollback

If a deployment fails:

1. Go to **Deployments** tab
2. Find the last successful deployment
3. Click **Rollback** to restore

## Database Backups

**Automatic backups** are included:
- Daily backups retained for 7 days
- Point-in-time recovery available

**Manual backup:**
1. Go to **Databases** > **freelance-platform-db**
2. Click **Backups**
3. Create manual backup

**Restore from backup:**
1. Select backup
2. Click **Restore**
3. Creates a new database cluster

## Cost Breakdown

### Starter Configuration
- **Backend API** (Basic XXS): $5/month
- **Frontend** (Static Site): $0/month (free!)
- **Database** (Basic): $15/month
- **Bandwidth**: First 1TB free
- **Total: ~$20/month**

### Production Configuration
- **Backend API** (Basic S, 2 instances): $48/month
- **Frontend** (Static Site): $0/month
- **Database** (Professional): $30/month
- **Total: ~$78/month**

### Comparison with Others

| Platform | Cost | Setup Time | Pros |
|----------|------|------------|------|
| **DigitalOcean App Platform** | $20/mo | 15 min | Easy, all-in-one, no cold starts |
| **Vercel + Neon** | $0-39/mo | 30 min | Serverless, free tier, global CDN |
| **DigitalOcean VPS** | $18/mo | 60 min | Full control, Docker, more config |
| **Heroku** | $25/mo | 20 min | Easy but expensive, no free tier |

## Troubleshooting

### Build Failed

**Check build logs:**
1. Go to **Deployments** > Failed deployment
2. View **Build Logs**
3. Fix errors and push again

**Common issues:**
- Missing dependencies in package.json
- Node version mismatch (specify in package.json)
- Build command incorrect

### Database Connection Failed

**Check connection:**
1. Verify database is running (Databases tab)
2. Check environment variables are set
3. View runtime logs for error messages

**Common issues:**
- Database not fully initialized yet (wait 5 minutes)
- Connection string format incorrect
- SSL required: add `?sslmode=require` to connection string

### Cannot Access API

**Check routes:**
1. Verify `/api` route is configured in backend
2. Check if health endpoint works: `/health`
3. Verify CORS settings (CLIENT_URL)

**Check logs:**
```bash
doctl apps logs <app-id> --type run --follow
```

### Frontend Cannot Connect to API

**Check environment variables:**
1. Verify `VITE_API_URL` is set correctly
2. Should be: `${api.PUBLIC_URL}/api`
3. Rebuild frontend if changed

**Check CORS:**
- Backend `CLIENT_URL` should match frontend URL
- Redeploy backend after changing

## Development Workflow

### Local Development

```bash
# Backend
npm install
npm run dev

# Frontend (in another terminal)
cd client
npm install
npm run dev
```

### Deploy to Production

```bash
# Commit changes
git add .
git commit -m "Your changes"

# Push to GitHub (auto-deploys)
git push origin main

# Or create a separate staging branch
git push origin staging
```

### Environment-specific Configs

**Development (.env):**
```env
DB_HOST=localhost
CLIENT_URL=http://localhost:3000
```

**Production (DigitalOcean env vars):**
- Automatically set via App Platform
- Use `${database.DATABASE_URL}` references

## CI/CD Pipeline

DigitalOcean App Platform includes built-in CI/CD:

1. **Commit & Push** → GitHub
2. **Trigger** → DigitalOcean detects push
3. **Build** → Runs build commands
4. **Test** → (Optional) Run tests before deploy
5. **Deploy** → Zero-downtime deployment
6. **Health Check** → Verifies app is running

### Add Tests to Pipeline

Update `.do/app.yaml`:

```yaml
services:
  - name: api
    build_command: npm install && npm test && npm run build
```

## Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **Database Access**: Limited to App Platform network
3. **HTTPS**: Automatic SSL certificates
4. **JWT Secrets**: Use strong 64-character random strings
5. **Rate Limiting**: Already implemented in Express app
6. **Database Backups**: Enabled by default
7. **Network Firewall**: Database not publicly accessible

## Maintenance

### Update Dependencies

```bash
# Update packages
npm update

# Commit and push
git push origin main
# Auto-deploys
```

### Database Maintenance

- **Connection Pooling**: Already configured in src/config/database.js
- **Indexes**: Add to schema for better performance
- **Monitoring**: Check database metrics in dashboard

### Logs Retention

- **Runtime Logs**: 7 days
- **Build Logs**: 30 days
- For longer retention, use external logging (Papertrail, Loggly)

## Migration from Vercel

If you already deployed to Vercel:

1. The serverless functions in `api/` are **not needed** for DigitalOcean
2. Use the original Express app in `src/`
3. Original code works out-of-the-box!
4. Follow this guide from Step 1

## Additional Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [doctl CLI Documentation](https://docs.digitalocean.com/reference/doctl/)
- [App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/)
- [Pricing Calculator](https://www.digitalocean.com/pricing/app-platform)

## Support

**DigitalOcean:**
- Documentation: [docs.digitalocean.com](https://docs.digitalocean.com)
- Community: [digitalocean.com/community](https://www.digitalocean.com/community)
- Support Tickets: Available 24/7

**Your App:**
- Project docs: [CLAUDE.md](CLAUDE.md)
- Docker deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- Vercel deployment: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

---

## Quick Reference

### Common Commands

```bash
# View app list
doctl apps list

# View logs
doctl apps logs <app-id> --follow

# Trigger deployment
git push origin main

# View deployments
doctl apps list-deployments <app-id>

# Update app spec
doctl apps update <app-id> --spec .do/app.yaml
```

### URLs

- Dashboard: https://cloud.digitalocean.com/apps
- Docs: https://docs.digitalocean.com/products/app-platform/
- Status: https://status.digitalocean.com/

---

**Your app is ready for DigitalOcean App Platform!** 🚀

Just push to GitHub and deploy. It's that simple!
