#!/bin/bash

# Maintenance Script
# Cleans up Docker resources and optimizes the system

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== System Maintenance ===${NC}\n"

# Stop containers
echo -e "${BLUE}[INFO]${NC} Stopping containers..."
docker-compose -f docker-compose.prod.yml down

# Remove unused Docker images
echo -e "${BLUE}[INFO]${NC} Removing unused Docker images..."
docker image prune -af

# Remove unused volumes (be careful with this!)
echo -e "${YELLOW}[WARNING]${NC} This will remove unused volumes"
read -p "Do you want to remove unused volumes? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
    docker volume prune -f
    echo -e "${GREEN}[SUCCESS]${NC} Unused volumes removed"
fi

# Remove unused networks
echo -e "${BLUE}[INFO]${NC} Removing unused networks..."
docker network prune -f

# Clean up old logs (keep last 30 days)
echo -e "${BLUE}[INFO]${NC} Cleaning up old log files..."
find ./logs -name "*.log" -type f -mtime +30 -delete 2>/dev/null || true

# Clean up old backups (keep last 30 days)
echo -e "${BLUE}[INFO]${NC} Cleaning up old backup files..."
find ./backups -name "backup_*.sql.gz" -type f -mtime +30 -delete 2>/dev/null || true

# Check disk space
echo -e "\n${BLUE}[INFO]${NC} Current disk usage:"
df -h | grep -E '^/dev/'

# Show Docker disk usage
echo -e "\n${BLUE}[INFO]${NC} Docker disk usage:"
docker system df

# Restart containers
echo -e "\n${BLUE}[INFO]${NC} Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

echo -e "\n${GREEN}[SUCCESS]${NC} Maintenance completed!"
