#!/bin/zsh

# Database Backup Script for Recipe Planner
# This script creates a compressed backup of the PostgreSQL database running in Docker

set -e  # Exit on any error

# Configuration (from docker-compose.yml)
CONTAINER_NAME="recipe-planner-db"
DB_NAME="recipe_planner"
DB_USER="recipe_user"
DB_PASSWORD="recipe_password"

# Backup directory and filename
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="recipe_planner_backup_${TIMESTAMP}.sql.gz" # Compressed file extension
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🗄️  Recipe Planner Database Backup (Compressed)${NC}"
echo "================================================="

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Check if Docker container is running
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo -e "${RED}❌ Error: Docker container '${CONTAINER_NAME}' is not running${NC}"
    echo "   Please start the database with: npm run db:up"
    exit 1
fi

# Check if database is accessible
echo "🔍 Checking database connection..."
if ! docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database is accessible${NC}"

# Create the compressed backup
echo "📦 Creating compressed backup..."
echo "   Source: ${DB_NAME} database in ${CONTAINER_NAME}"
echo "   Target: ${BACKUP_PATH}"

# Use pg_dump and pipe to gzip for compression
docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --no-owner \
    --no-privileges | gzip > "${BACKUP_PATH}"

# Check pipeline status
if [[ ${PIPESTATUS[1]} -eq 0 && ${PIPESTATUS[2]} -eq 0 ]]; then
    # Get backup file size
    BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
    
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "   File: ${BACKUP_PATH}"
    echo "   Size: ${BACKUP_SIZE}"
    echo ""
    
    # List recent backups
    echo "📁 Recent backups:"
    ls -la "${BACKUP_DIR}"/recipe_planner_backup_*.sql.gz 2>/dev/null | tail -5 | while read line; do
        echo "   $line"
    done
    
    # Cleanup old backups (keep last 10)
    echo ""
    echo "🧹 Cleaning up old backups (keeping last 10)..."
    cd "${BACKUP_DIR}"
    ls -t recipe_planner_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f
    
    echo -e "${GREEN}🎉 Backup process completed!${NC}"
else
    echo -e "${RED}❌ Backup failed! Check pg_dump or gzip output.${NC}"
    # Clean up failed backup file
    rm -f "${BACKUP_PATH}"
    exit 1
fi
