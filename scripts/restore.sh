#!/bin/bash

# Database Restore Script
# Restores MySQL database from a backup file

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
else
    echo -e "${RED}[ERROR]${NC} .env.production file not found!"
    exit 1
fi

BACKUP_DIR="./backups"

# List available backups
echo -e "${BLUE}Available backups:${NC}"
ls -lh ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null || {
    echo -e "${RED}[ERROR]${NC} No backup files found in ${BACKUP_DIR}"
    exit 1
}

echo ""
read -p "Enter the backup filename to restore (e.g., backup_freelance_platform_20240101_120000.sql.gz): " BACKUP_FILE

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

if [ ! -f "${BACKUP_PATH}" ]; then
    echo -e "${RED}[ERROR]${NC} Backup file not found: ${BACKUP_PATH}"
    exit 1
fi

echo -e "${YELLOW}[WARNING]${NC} This will overwrite the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${BLUE}[INFO]${NC} Restore cancelled"
    exit 0
fi

# Create a safety backup before restore
echo -e "${BLUE}[INFO]${NC} Creating safety backup of current database..."
SAFETY_BACKUP="${BACKUP_DIR}/safety_backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose -f docker-compose.prod.yml exec -T mysql mysqldump \
    -u root \
    -p${DB_ROOT_PASSWORD} \
    --single-transaction \
    ${DB_NAME} > ${SAFETY_BACKUP}
gzip ${SAFETY_BACKUP}
echo -e "${GREEN}[SUCCESS]${NC} Safety backup created: ${SAFETY_BACKUP}.gz"

# Decompress and restore
echo -e "${BLUE}[INFO]${NC} Restoring database from ${BACKUP_FILE}..."
gunzip -c ${BACKUP_PATH} | docker-compose -f docker-compose.prod.yml exec -T mysql mysql \
    -u root \
    -p${DB_ROOT_PASSWORD} \
    ${DB_NAME}

echo -e "${GREEN}[SUCCESS]${NC} Database restored successfully!"
echo -e "${BLUE}[INFO]${NC} Safety backup kept at: ${SAFETY_BACKUP}.gz"
