# DevOps Setup - Complete Overview

This document provides an overview of the complete DevOps setup for deploying the Freelancing Platform on DigitalOcean VPS.

## What's Included

This repository includes a complete production-ready deployment setup that you can clone and deploy in minutes.

### Core Infrastructure

- **Docker Compose**: Production orchestration with optimized containers
- **Nginx**: Reverse proxy with SSL/TLS, rate limiting, and caching
- **Let's Encrypt**: Automated SSL certificate management
- **MySQL 8.0**: Containerized database with health checks
- **Node.js**: Production-optimized API server
- **React**: Static build served by Nginx

### Deployment Automation

- **One-command deployment**: `./deploy.sh` sets up everything
- **Automated SSL**: Certificates obtained and renewed automatically
- **Firewall configuration**: UFW setup with fail2ban
- **Health monitoring**: Automated checks for all services

### Management Scripts

Located in `scripts/`:
- `backup.sh` - Database backup with compression
- `restore.sh` - Safe database restoration
- `update.sh` - Zero-downtime updates
- `health-check.sh` - Comprehensive system health check
- `logs.sh` - Easy log viewing
- `maintenance.sh` - System cleanup and optimization

### Security Features

- **SSL/TLS encryption** via Let's Encrypt
- **Rate limiting** on API endpoints
- **Firewall** configuration (UFW)
- **fail2ban** protection
- **Security headers** (helmet.js)
- **CORS protection**
- **Non-root Docker containers**
- **Secret management** via environment variables

### Monitoring & Logging

- **Docker health checks** for all services
- **Centralized logging** via Docker logs
- **Health check endpoint** for uptime monitoring
- **Resource monitoring** (CPU, memory, disk)
- **SSL expiry monitoring**

## Quick Start

### 1. Prerequisites

- DigitalOcean droplet (Ubuntu 22.04, min 2GB RAM)
- Domain name pointed to droplet IP
- SSH access

### 2. One-Command Deploy

```bash
# On your server
git clone https://github.com/yourusername/your-repo.git
cd your-repo
cp .env.production.example .env.production
nano .env.production  # Fill in values
chmod +x deploy.sh scripts/*.sh
./deploy.sh
```

That's it! Your app is now live at `https://yourdomain.com`

## Documentation

### For Quick Setup
📖 [QUICKSTART.md](./QUICKSTART.md) - 10-minute deployment guide

### For Detailed Setup
📖 [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive deployment guide

### For Development
📖 [CLAUDE.md](./CLAUDE.md) - Project structure and development guide

### For Scripts
📖 [scripts/README.md](./scripts/README.md) - Script documentation

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Internet                       │
└────────────────────┬────────────────────────────┘
                     │ HTTPS (443)
                     │ HTTP (80)
                     ▼
         ┌──────────────────────┐
         │   Nginx (Container)   │
         │  - Reverse Proxy      │
         │  - SSL Termination    │
         │  - Rate Limiting      │
         │  - Static Files       │
         └──────────┬────────────┘
                    │
        ┌───────────┴──────────┐
        │                      │
        ▼                      ▼
┌──────────────┐      ┌─────────────────┐
│ API Server   │      │ React Frontend  │
│ (Node.js)    │      │ (Static Build)  │
│  Container   │      │  Served by      │
│              │      │  Nginx          │
└──────┬───────┘      └─────────────────┘
       │
       ▼
┌──────────────┐      ┌─────────────────┐
│   MySQL 8    │◄────►│    Certbot      │
│  Container   │      │   (SSL Certs)   │
└──────────────┘      └─────────────────┘
```

## File Structure

```
.
├── deploy.sh                      # Main deployment script
├── docker-compose.prod.yml        # Production Docker setup
├── Dockerfile.prod               # Production API Dockerfile
├── .env.production.example       # Environment template
│
├── nginx/                        # Nginx configuration
│   ├── nginx.conf               # Main Nginx config
│   └── conf.d/
│       └── app.conf             # Site configuration
│
├── client/
│   ├── Dockerfile.prod          # Production frontend Dockerfile
│   └── nginx.conf               # Frontend Nginx config
│
├── scripts/                      # Management scripts
│   ├── backup.sh               # Database backup
│   ├── restore.sh              # Database restore
│   ├── update.sh               # Update deployment
│   ├── health-check.sh         # Health monitoring
│   ├── logs.sh                 # Log viewer
│   ├── maintenance.sh          # System maintenance
│   └── README.md               # Scripts documentation
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline (GitHub Actions)
│
├── backups/                     # Database backups (gitignored)
├── certbot/                     # SSL certificates (gitignored)
├── logs/                        # Application logs (gitignored)
│
├── DEPLOYMENT.md                # Full deployment guide
├── QUICKSTART.md                # Quick start guide
├── DEVOPS.md                    # This file
└── CLAUDE.md                    # Project documentation
```

## Common Commands

```bash
# View logs
./scripts/logs.sh all -f

# Check health
./scripts/health-check.sh

# Backup database
./scripts/backup.sh

# Update app
./scripts/update.sh

# System maintenance
./scripts/maintenance.sh

# Restart services
docker-compose -f docker-compose.prod.yml restart

# View status
docker-compose -f docker-compose.prod.yml ps

# Access MySQL
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p
```

## Deployment Workflow

### Initial Deployment

1. **Prepare Server**
   - Create DigitalOcean droplet
   - Point domain to server IP
   - SSH into server

2. **Configure Application**
   - Clone repository
   - Copy and edit `.env.production`
   - Generate secure secrets

3. **Deploy**
   - Run `./deploy.sh`
   - Wait for SSL certificate
   - Verify deployment

### Regular Updates

1. **Push Code**
   ```bash
   git push origin main
   ```

2. **Deploy Updates**
   ```bash
   # On server
   ./scripts/update.sh
   ```

3. **Verify**
   ```bash
   ./scripts/health-check.sh
   ```

### CI/CD (Optional)

GitHub Actions workflow included:
- Runs on push to `main`
- Executes tests (if configured)
- Deploys to production via SSH
- Runs health checks
- Can notify on Slack/Discord

**Setup:**
Add these secrets to GitHub repository:
- `DROPLET_IP` - Your server IP
- `DROPLET_USER` - SSH user (e.g., deployer)
- `SSH_PRIVATE_KEY` - SSH private key
- `DOMAIN` - Your domain name

## Performance Optimization

### Included Optimizations

- **Multi-stage Docker builds** - Smaller images
- **Gzip compression** - Faster page loads
- **Static asset caching** - Browser caching enabled
- **Rate limiting** - Prevent abuse
- **Connection pooling** - Efficient database connections
- **Resource limits** - Prevent container resource hogging

### Recommended Upgrades

For high traffic:
- Add Redis for session/cache
- Set up database read replicas
- Use CDN for static assets
- Enable horizontal scaling with load balancer
- Add monitoring (Datadog, New Relic)

## Maintenance Schedule

### Daily (Automated)
- ✅ Database backups (via cron)
- ✅ SSL certificate renewal check

### Weekly (Manual)
- Check logs for errors
- Review disk space
- Monitor performance

### Monthly (Manual)
- Run `./scripts/maintenance.sh`
- Review security updates
- Check backup integrity
- Update system packages

## Cost Breakdown

### Minimum Production Setup
- **Droplet**: $18/month (2GB, 2 vCPUs)
- **Domain**: $12/year
- **SSL**: $0 (Let's Encrypt)
- **Total**: ~$20/month

### Recommended Production Setup
- **Droplet**: $24/month (4GB, 2 vCPUs)
- **Managed Database**: $15/month (optional)
- **Backups**: $5/month (20% of droplet)
- **Total**: ~$45/month

### High-Traffic Setup
- **Droplet**: $48/month (8GB, 4 vCPUs)
- **Managed Database**: $30/month
- **Load Balancer**: $12/month
- **Spaces + CDN**: $5/month
- **Total**: ~$95/month

## Monitoring

### Built-in Monitoring

The `health-check.sh` script monitors:
- Container status and health
- Database connectivity
- API server response
- Web server status
- SSL certificate expiry
- Disk space usage
- Memory usage
- Recent errors

### External Monitoring (Recommended)

Consider adding:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Performance**: New Relic, Datadog
- **Log aggregation**: Papertrail, Loggly

## Security Best Practices

### Implemented

✅ SSL/TLS encryption
✅ Firewall (UFW)
✅ fail2ban
✅ Rate limiting
✅ Security headers
✅ Non-root containers
✅ Environment-based secrets
✅ Regular security updates

### Recommended Additional Steps

- Set up SSH key-only authentication
- Enable 2FA for DigitalOcean
- Regular security audits
- Implement WAF (Web Application Firewall)
- Set up intrusion detection
- Regular backup testing
- Implement log monitoring alerts

## Troubleshooting

### Common Issues

**SSL Certificate Failed**
- Wait for DNS propagation
- Check domain configuration
- Manually run certbot (see DEPLOYMENT.md)

**Out of Memory**
- Add swap space
- Upgrade droplet
- Optimize container resources

**Database Connection Failed**
- Check MySQL logs: `./scripts/logs.sh mysql`
- Verify credentials in `.env.production`
- Restart MySQL: `docker-compose -f docker-compose.prod.yml restart mysql`

**Nginx Not Starting**
- Check nginx logs: `./scripts/logs.sh nginx`
- Verify configuration syntax
- Check SSL certificate paths

### Getting Help

1. Check logs: `./scripts/logs.sh all --tail 200`
2. Run health check: `./scripts/health-check.sh`
3. Review documentation in this repository
4. Check DigitalOcean community tutorials
5. Review Docker and Nginx documentation

## Backup & Recovery

### Automated Backups

Set up with cron:
```bash
crontab -e
# Add:
0 2 * * * cd /home/deployer/your-repo && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### Manual Backup

```bash
./scripts/backup.sh
```

### Restore from Backup

```bash
./scripts/restore.sh
```

### Backup Retention

- Daily backups: 7 days
- Weekly backups: 30 days (configure separately)
- Monthly backups: 1 year (configure separately)

## Scaling Strategy

### Vertical Scaling (Easier)

Upgrade DigitalOcean droplet size:
1. Take snapshot
2. Resize droplet
3. Restart services

### Horizontal Scaling (Better for high traffic)

1. **Database**: Move to managed MySQL or add replicas
2. **Application**: Run multiple app containers with load balancer
3. **Static Assets**: Use DigitalOcean Spaces + CDN
4. **Sessions**: Add Redis for session management
5. **Load Balancer**: DigitalOcean Load Balancer

## Support & Resources

### Documentation
- [Quick Start Guide](./QUICKSTART.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Project Documentation](./CLAUDE.md)
- [Scripts Documentation](./scripts/README.md)

### External Resources
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)

### Community
- GitHub Issues for bug reports
- DigitalOcean Community for infrastructure questions
- Stack Overflow for technical questions

## License

See LICENSE file in repository root.

---

**Ready to deploy?** Start with [QUICKSTART.md](./QUICKSTART.md) →
