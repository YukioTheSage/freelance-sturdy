#!/bin/bash

# Database Backup Script
# Creates a backup of the MySQL database with timestamp

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment variables
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
else
    echo -e "${RED}[ERROR]${NC} .env.production file not found!"
    exit 1
fi

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql"
DAYS_TO_KEEP=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo -e "${BLUE}[INFO]${NC} Starting database backup..."

# Create backup
docker-compose -f docker-compose.prod.yml exec -T mysql mysqldump \
    -u root \
    -p${DB_ROOT_PASSWORD} \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    ${DB_NAME} > ${BACKUP_FILE}

# Compress backup
echo -e "${BLUE}[INFO]${NC} Compressing backup..."
gzip ${BACKUP_FILE}
BACKUP_FILE="${BACKUP_FILE}.gz"

# Calculate size
SIZE=$(du -h ${BACKUP_FILE} | cut -f1)

echo -e "${GREEN}[SUCCESS]${NC} Backup created: ${BACKUP_FILE} (${SIZE})"

# Delete old backups
echo -e "${BLUE}[INFO]${NC} Cleaning up old backups (keeping last ${DAYS_TO_KEEP} days)..."
find ${BACKUP_DIR} -name "backup_*.sql.gz" -type f -mtime +${DAYS_TO_KEEP} -delete

# Count remaining backups
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | wc -l)
echo -e "${GREEN}[SUCCESS]${NC} Total backups: ${BACKUP_COUNT}"
