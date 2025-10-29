# Deployment Scripts

Collection of utility scripts for managing your production deployment.

## Available Scripts

### backup.sh
Creates a compressed backup of the MySQL database.

```bash
./scripts/backup.sh
```

**Features:**
- Timestamped backups in `./backups/` directory
- Automatic compression (gzip)
- Automatic cleanup of backups older than 7 days
- Safe backup with `--single-transaction`

**Automation:**
Set up daily backups with cron:
```bash
crontab -e
# Add: 0 2 * * * cd /path/to/app && ./scripts/backup.sh >> logs/backup.log 2>&1
```

### restore.sh
Restores the database from a backup file.

```bash
./scripts/restore.sh
```

**Features:**
- Interactive selection of backup file
- Safety backup before restore
- Confirmation prompt to prevent accidents

### update.sh
Quick update script for deploying new code.

```bash
./scripts/update.sh
```

**Features:**
- Pulls latest code from git
- Rebuilds containers
- Restarts services with zero-downtime
- Cleans up old images

**When to use:**
- After pushing new code to production branch
- For quick hotfixes
- Regular updates

### health-check.sh
Comprehensive health check of all services.

```bash
./scripts/health-check.sh
```

**Checks:**
- Container status
- MySQL connectivity
- API server response
- Nginx status
- SSL certificate expiry
- Disk space usage
- Memory usage
- Recent error logs

**When to use:**
- Regular monitoring (daily/weekly)
- After deployments
- When investigating issues
- Before and after maintenance

### logs.sh
Easy access to Docker container logs.

```bash
./scripts/logs.sh <service> [options]
```

**Examples:**
```bash
# Follow all logs
./scripts/logs.sh all -f

# Show app logs
./scripts/logs.sh app

# Follow nginx logs
./scripts/logs.sh nginx -f

# Last 100 MySQL logs
./scripts/logs.sh mysql --tail 100
```

**Available services:**
- `all` - All services
- `app` - Node.js API server
- `mysql` - MySQL database
- `nginx` - Nginx web server
- `client` - React frontend (if running in container)
- `certbot` - SSL certificate manager

### maintenance.sh
System maintenance and cleanup script.

```bash
./scripts/maintenance.sh
```

**Actions:**
- Stops containers
- Removes unused Docker images
- Optionally removes unused volumes (asks for confirmation)
- Removes unused networks
- Cleans up old log files (30+ days)
- Cleans up old backups (30+ days)
- Shows disk usage
- Restarts containers

**When to use:**
- Monthly maintenance
- When disk space is low
- Before major updates
- When Docker is using too much space

**Warning:** Be careful with volume pruning - it will remove ALL unused volumes including database data if not properly configured.

## Best Practices

### Regular Maintenance Schedule

**Daily:**
- Automated backups (via cron)
- Health checks

**Weekly:**
- Review logs for errors
- Check disk space
- Monitor performance

**Monthly:**
- Run maintenance script
- Review and clean old backups
- Update system packages
- Rotate secrets (if needed)

### Before Deployments

1. Create a backup:
   ```bash
   ./scripts/backup.sh
   ```

2. Run health check:
   ```bash
   ./scripts/health-check.sh
   ```

### After Deployments

1. Check service status:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. Monitor logs:
   ```bash
   ./scripts/logs.sh all -f
   ```

3. Run health check:
   ```bash
   ./scripts/health-check.sh
   ```

### Emergency Recovery

If something goes wrong:

1. Check what's failing:
   ```bash
   ./scripts/health-check.sh
   ./scripts/logs.sh all --tail 200
   ```

2. If database is corrupted:
   ```bash
   ./scripts/restore.sh
   ```

3. If services won't start:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. If still having issues:
   ```bash
   # Full rebuild
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml build --no-cache
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Script Permissions

If scripts are not executable:

```bash
chmod +x scripts/*.sh
```

## Logging Script Output

Capture script output to log files:

```bash
# Append to log file
./scripts/backup.sh >> logs/backup.log 2>&1

# View log file
tail -f logs/backup.log
```

## Troubleshooting

### Permission Denied

**Problem:** `permission denied` when running scripts

**Solution:**
```bash
chmod +x scripts/*.sh
```

### Docker Permission Denied

**Problem:** Docker commands fail with permission errors

**Solution:** Make sure user is in docker group and log out/in:
```bash
sudo usermod -aG docker $USER
# Then log out and back in
```

### Script Not Found

**Problem:** `command not found` when running script

**Solution:** Use relative path from project root:
```bash
./scripts/backup.sh
```

Or use absolute path:
```bash
/home/deployer/your-repo/scripts/backup.sh
```

## Advanced Usage

### Custom Backup Location

Edit `backup.sh` and change:
```bash
BACKUP_DIR="./backups"
```

### Change Backup Retention

Edit `backup.sh` and change:
```bash
DAYS_TO_KEEP=7
```

### Custom Log Retention

Edit `maintenance.sh` and change:
```bash
find ./logs -name "*.log" -type f -mtime +30 -delete
```

## Integration with CI/CD

Scripts can be used in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Deploy
  run: |
    ssh user@server 'cd /app && ./scripts/update.sh'

- name: Health Check
  run: |
    ssh user@server 'cd /app && ./scripts/health-check.sh'
```

## Security Notes

- Scripts require appropriate permissions
- Database credentials are read from `.env.production`
- Backup files may contain sensitive data - secure them properly
- Don't commit scripts with hardcoded credentials
- Use SSH key authentication for automated runs

## Need Help?

- Main deployment guide: [../DEPLOYMENT.md](../DEPLOYMENT.md)
- Quick start guide: [../QUICKSTART.md](../QUICKSTART.md)
- Project documentation: [../CLAUDE.md](../CLAUDE.md)
