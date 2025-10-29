# Production Deployment Guide - DigitalOcean VPS

Complete guide for deploying the Freelancing Platform on a DigitalOcean VPS with one-command setup.

## Prerequisites

- DigitalOcean Droplet (Ubuntu 20.04/22.04 LTS) - Minimum 2GB RAM, 2 vCPUs
- Domain name pointed to your droplet's IP address
- SSH access to your server
- Git installed on your local machine

## Quick Deployment (5 Minutes)

### 1. Initial Server Setup

SSH into your DigitalOcean droplet:
```bash
ssh root@your-server-ip
```

Create a non-root user (recommended):
```bash
adduser deployer
usermod -aG sudo deployer
su - deployer
```

### 2. Clone Repository

```bash
cd ~
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### 3. Configure Environment

Copy and edit the production environment file:
```bash
cp .env.production.example .env.production
nano .env.production
```

**Required Configuration:**
```env
DOMAIN=yourdomain.com
EMAIL=your-email@example.com
DB_ROOT_PASSWORD=<strong-password>
DB_PASSWORD=<strong-password>
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
CLIENT_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
```

**Generate secure secrets:**
```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Run Deployment Script

Make scripts executable:
```bash
chmod +x deploy.sh scripts/*.sh
```

Deploy the application:
```bash
./deploy.sh
```

That's it! The script will:
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Set up fail2ban for security
- Build and start all containers
- Obtain SSL certificate from Let's Encrypt
- Configure Nginx with HTTPS

### 5. Verify Deployment

Visit your domain:
- Frontend: `https://yourdomain.com`
- API: `https://yourdomain.com/api`
- Health: `https://yourdomain.com/health`

Check service status:
```bash
./scripts/health-check.sh
```

## Post-Deployment

### Seed Database (Optional)

If you want to populate with sample data:
```bash
docker-compose -f docker-compose.prod.yml exec app node src/db/seed.js
```

### Set Up Automated Backups

Add to crontab for daily backups at 2 AM:
```bash
crontab -e
```

Add this line:
```
0 2 * * * cd /home/deployer/your-repo && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Monitor Logs

View real-time logs:
```bash
./scripts/logs.sh all -f
```

View specific service logs:
```bash
./scripts/logs.sh app -f           # API server logs
./scripts/logs.sh nginx -f         # Nginx logs
./scripts/logs.sh mysql --tail 100 # Last 100 MySQL logs
```

## Common Operations

### Update Application

When you push new code to your repository:
```bash
./scripts/update.sh
```

### Backup Database

Manual backup:
```bash
./scripts/backup.sh
```

Backups are stored in `./backups/` directory.

### Restore Database

Restore from a backup:
```bash
./scripts/restore.sh
```

### View Service Status

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Restart Services

Restart all services:
```bash
docker-compose -f docker-compose.prod.yml restart
```

Restart specific service:
```bash
docker-compose -f docker-compose.prod.yml restart app
docker-compose -f docker-compose.prod.yml restart nginx
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Maintenance

### System Maintenance

Run periodic maintenance (cleanup old Docker images, logs, backups):
```bash
./scripts/maintenance.sh
```

### SSL Certificate Renewal

Certificates auto-renew via certbot container. To manually renew:
```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

### Check System Health

```bash
./scripts/health-check.sh
```

This checks:
- Container status
- MySQL connectivity
- API server response
- Nginx status
- SSL certificate expiry
- Disk space
- Memory usage

## Troubleshooting

### SSL Certificate Issues

If SSL setup fails during deployment:

1. Make sure your domain DNS is properly configured
2. Wait for DNS propagation (can take up to 48 hours)
3. Manually obtain certificate:
```bash
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com
```
4. Uncomment HTTPS configuration in `nginx/conf.d/app.conf`
5. Restart nginx: `docker-compose -f docker-compose.prod.yml restart nginx`

### Database Connection Issues

Check MySQL logs:
```bash
./scripts/logs.sh mysql --tail 100
```

Check database connectivity:
```bash
docker-compose -f docker-compose.prod.yml exec mysql mysqladmin ping
```

### API Server Not Responding

Check app logs:
```bash
./scripts/logs.sh app -f
```

Restart app:
```bash
docker-compose -f docker-compose.prod.yml restart app
```

### Out of Memory

Check memory usage:
```bash
free -h
docker stats
```

Consider upgrading your droplet or adding swap:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Disk Space Full

Check disk usage:
```bash
df -h
```

Clean up Docker resources:
```bash
./scripts/maintenance.sh
```

### Container Won't Start

Check container logs:
```bash
docker-compose -f docker-compose.prod.yml logs <service-name>
```

Rebuild container:
```bash
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate <service-name>
```

## Security Considerations

### Firewall

The deployment script configures UFW to only allow:
- SSH (port 22)
- HTTP (port 80)
- HTTPS (port 443)

Check firewall status:
```bash
sudo ufw status
```

### fail2ban

Configured to protect against brute force attacks. Check status:
```bash
sudo fail2ban-client status
```

### Regular Updates

Keep system packages updated:
```bash
sudo apt update && sudo apt upgrade -y
```

Update Docker images:
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

- Never commit `.env.production` to version control
- Use strong, random passwords
- Rotate secrets periodically
- Keep JWT secrets secure

## Performance Optimization

### Enable Swap (if not already enabled)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Monitor Resource Usage

```bash
# Real-time container stats
docker stats

# System resource usage
htop

# Disk I/O
iotop
```

### Database Optimization

For high traffic, consider:
- Increase MySQL connection pool size
- Enable query caching
- Add database indexes
- Set up read replicas

## Scaling

### Horizontal Scaling

For high traffic, consider:
1. Load balancer (DigitalOcean Load Balancer)
2. Multiple app containers
3. Separate database server (DigitalOcean Managed MySQL)
4. Redis for session storage
5. CDN for static assets (DigitalOcean Spaces + CDN)

### Vertical Scaling

Upgrade your droplet size from DigitalOcean dashboard.

## Monitoring & Logging

### Log Files

Logs are stored in:
- Application logs: Docker container logs
- Nginx logs: `/var/log/nginx/` (inside nginx container)
- Backup logs: `./logs/backup.log`

### External Monitoring (Recommended)

Consider setting up:
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Performance monitoring (New Relic, Datadog)
- Log aggregation (Papertrail, Loggly)

## Cost Estimation

### DigitalOcean Costs (Monthly)

- Basic Droplet (2GB, 2 vCPUs): $18/month
- Recommended Droplet (4GB, 2 vCPUs): $24/month
- Production Droplet (8GB, 4 vCPUs): $48/month
- Managed Database (optional): Starting at $15/month
- Backups (optional): 20% of droplet cost
- Load Balancer (optional): $12/month

### Additional Costs

- Domain name: $10-15/year
- SSL certificate: Free (Let's Encrypt)
- Email service (optional): $10-30/month

## Support

### Resources

- [Project Documentation](./CLAUDE.md)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### Common Commands Reference

```bash
# View all logs
./scripts/logs.sh all -f

# Check health
./scripts/health-check.sh

# Backup database
./scripts/backup.sh

# Restore database
./scripts/restore.sh

# Update application
./scripts/update.sh

# System maintenance
./scripts/maintenance.sh

# Restart all services
docker-compose -f docker-compose.prod.yml restart

# View service status
docker-compose -f docker-compose.prod.yml ps

# Execute command in container
docker-compose -f docker-compose.prod.yml exec app <command>
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p
```

## Next Steps

After successful deployment:

1. Test all features thoroughly
2. Set up automated backups
3. Configure monitoring and alerts
4. Set up CI/CD pipeline (GitHub Actions, GitLab CI)
5. Implement logging and error tracking
6. Create staging environment
7. Document your API with Swagger/OpenAPI
8. Set up database replication for high availability

## License

See LICENSE file in the repository root.
