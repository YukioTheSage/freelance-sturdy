# Quick Start - DigitalOcean Deployment

Get your application running in production in under 10 minutes.

## What You Need

- DigitalOcean account
- Domain name
- 10 minutes

## Step-by-Step

### 1. Create Droplet (2 minutes)

1. Log into [DigitalOcean](https://cloud.digitalocean.com/)
2. Click **Create** → **Droplets**
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic Plan - 2GB RAM ($18/month minimum)
   - **Datacenter**: Nearest to your users
   - **Authentication**: SSH Key (recommended) or Password
4. Click **Create Droplet**
5. Note your droplet's IP address

### 2. Configure Domain (1 minute)

Point your domain to the droplet:

1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Add DNS A records:
   - `@` (root) → `your-droplet-ip`
   - `www` → `your-droplet-ip`
3. Wait 5-10 minutes for DNS propagation

### 3. Connect to Server (1 minute)

```bash
ssh root@your-droplet-ip
```

Create a deployment user:
```bash
adduser deployer
usermod -aG sudo deployer
su - deployer
```

### 4. Clone & Configure (2 minutes)

```bash
# Clone repository
cd ~
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Configure environment
cp .env.production.example .env.production
nano .env.production
```

**Fill in these values:**
```env
DOMAIN=yourdomain.com
EMAIL=your-email@example.com
DB_ROOT_PASSWORD=YourStrongPassword123!
DB_PASSWORD=YourStrongPassword456!
JWT_SECRET=<paste-64-char-string>
JWT_REFRESH_SECRET=<paste-64-char-string>
CLIENT_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
```

**Generate secrets in a new terminal:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save and exit: `Ctrl+X`, `Y`, `Enter`

### 5. Deploy (3 minutes)

```bash
chmod +x deploy.sh scripts/*.sh
./deploy.sh
```

The script will install and configure everything automatically.

### 6. Verify (1 minute)

Visit your domain: `https://yourdomain.com`

Check health:
```bash
./scripts/health-check.sh
```

## Done! 🎉

Your application is now live at `https://yourdomain.com`

## Next Steps

### Seed Database (Optional)
```bash
docker-compose -f docker-compose.prod.yml exec app node src/db/seed.js
```

### Set Up Daily Backups
```bash
crontab -e
# Add this line:
0 2 * * * cd /home/deployer/your-repo && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Monitor Your App
```bash
# View all logs
./scripts/logs.sh all -f

# Check system health
./scripts/health-check.sh
```

## Common Issues

### SSL Certificate Failed
**Problem**: DNS not propagated yet
**Solution**: Wait 30 minutes and run:
```bash
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email your@email.com --agree-tos -d yourdomain.com -d www.yourdomain.com
```

Then uncomment HTTPS section in `nginx/conf.d/app.conf` and restart:
```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

### Docker Permission Denied
**Problem**: User not in docker group
**Solution**: Log out and back in:
```bash
exit
exit
ssh deployer@your-droplet-ip
```

### Out of Memory
**Problem**: 2GB RAM not enough
**Solution**: Add swap:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Need Help?

- Full documentation: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Project guide: [CLAUDE.md](./CLAUDE.md)

## Update Your App

When you push new code:
```bash
./scripts/update.sh
```

## Useful Commands

```bash
# View logs
./scripts/logs.sh all -f

# Backup database
./scripts/backup.sh

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Check status
docker-compose -f docker-compose.prod.yml ps

# System maintenance
./scripts/maintenance.sh
```
