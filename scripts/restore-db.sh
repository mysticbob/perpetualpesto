#!/bin/zsh

# Database Restore Script for Recipe Planner
# This script restores a compressed PostgreSQL database backup to the Docker container

set -e  # Exit on any error

# Configuration (from docker-compose.yml)
CONTAINER_NAME="recipe-planner-db"
DB_NAME="recipe_planner"
DB_USER="recipe_user"
DB_PASSWORD="recipe_password"

# Backup directory
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Recipe Planner Database Restore (from Compressed Backup)${NC}"
echo "================================================="

# Check if backup directory exists
if [ ! -d "${BACKUP_DIR}" ]; then
    echo -e "${RED}❌ Error: Backup directory '${BACKUP_DIR}' does not exist${NC}"
    echo "   Please create a backup first with: ./scripts/backup-db.sh"
    exit 1
fi

# Check if Docker container is running
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo -e "${RED}❌ Error: Docker container '${CONTAINER_NAME}' is not running${NC}"
    echo "   Please start the database with: npm run db:up"
    exit 1
fi

# List available compressed backups
echo "📁 Available backups:"
BACKUP_FILES=($(ls -t "${BACKUP_DIR}"/recipe_planner_backup_*.sql.gz 2>/dev/null))

if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No backup files found in ${BACKUP_DIR}${NC}"
    echo "   Please create a backup first with: ./scripts/backup-db.sh"
    exit 1
fi

# Display numbered list of backups
for i in "${!BACKUP_FILES[@]}"; do
    BACKUP_FILE="${BACKUP_FILES[$i]}"
    BACKUP_NAME=$(basename "${BACKUP_FILE}")
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    BACKUP_DATE=$(echo "${BACKUP_NAME}" | grep -o '[0-9]\{8\}_[0-9]\{6\}' | sed 's/_/ /')
    echo -e "   ${BLUE}$((i+1)). ${BACKUP_NAME}${NC} (${BACKUP_SIZE}) - ${BACKUP_DATE}"
done

echo ""

# Get user selection
if [ $# -eq 1 ]; then
    # Backup file provided as argument
    RESTORE_FILE="$1"
    if [ ! -f "${RESTORE_FILE}" ]; then
        echo -e "${RED}❌ Error: Backup file '${RESTORE_FILE}' not found${NC}"
        exit 1
    fi
else
    # Interactive selection
    echo -n "Select backup to restore (1-${#BACKUP_FILES[@]}), or press Enter for latest: "
    read SELECTION
    
    if [ -z "${SELECTION}" ]; then
        SELECTION=1
    fi
    
    # Validate selection
    if ! [[ "${SELECTION}" =~ ^[0-9]+$ ]] || [ "${SELECTION}" -lt 1 ] || [ "${SELECTION}" -gt ${#BACKUP_FILES[@]} ]; then
        echo -e "${RED}❌ Invalid selection${NC}"
        exit 1
    fi
    
    RESTORE_FILE="${BACKUP_FILES[$((SELECTION-1))]}"
fi

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will completely replace the current database!${NC}"
echo "   Selected backup: $(basename "${RESTORE_FILE}")"
echo -n "Are you sure you want to continue? (y/N): "
read CONFIRM

if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""

# Check if database is accessible
echo "🔍 Checking database connection..."
if ! docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database is accessible${NC}"

# Create a pre-restore backup (compressed)
echo "💾 Creating pre-restore backup..."
PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --no-owner \
    --no-privileges | gzip > "${PRE_RESTORE_BACKUP}"

if [[ ${PIPESTATUS[1]} -eq 0 && ${PIPESTATUS[2]} -eq 0 ]]; then
    echo -e "${GREEN}✅ Pre-restore backup saved: $(basename "${PRE_RESTORE_BACKUP}")${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Failed to create pre-restore backup. Continuing without it...${NC}"
fi

# Restore the database
echo "🔄 Restoring database..."
echo "   Source: $(basename "${RESTORE_FILE}")"
echo "   Target: ${DB_NAME} database in ${CONTAINER_NAME}"

# Drop existing connections to the database
docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    psql -U "${DB_USER}" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

# Restore from compressed backup
gunzip -c "${RESTORE_FILE}" | docker exec -i -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    psql -U "${DB_USER}" -d postgres

# Check pipeline status
if [[ ${PIPESTATUS[1]} -eq 0 && ${PIPESTATUS[2]} -eq 0 ]]; then
    echo -e "${GREEN}✅ Database restore completed successfully!${NC}"
    echo ""
    echo "🔍 Verifying restore..."
    
    # Check if we can connect to the restored database
    if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is accessible after restore${NC}"
        
        # Show table count as a basic verification
        TABLE_COUNT=$(docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
            psql -U "${DB_USER}" -d "${DB_NAME}" -t -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        
        if [ ! -z "${TABLE_COUNT}" ] && [ "${TABLE_COUNT}" -gt 0 ]; then
            echo -e "${GREEN}✅ Found ${TABLE_COUNT} tables in restored database${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Warning: Database connection test failed after restore${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Restore process completed!${NC}"
    echo "   You may need to restart your application to see the changes."
    echo "   Your original database state has been backed up to: $(basename "${PRE_RESTORE_BACKUP}" 2>/dev/null || echo 'Pre-restore backup failed')"
else
    echo -e "${RED}❌ Database restore failed! Check psql or gunzip output.${NC}"
    echo "   An attempt will be made to restore the pre-restore backup to minimize data loss."
    
    # Attempt to restore pre-restore backup
    if [ -f "${PRE_RESTORE_BACKUP}" ]; then
        echo "   Attempting to restore from: $(basename "${PRE_RESTORE_BACKUP}")"
        gunzip -c "${PRE_RESTORE_BACKUP}" | docker exec -i -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres >/dev/null 2>&1
        if [ ${PIPESTATUS[0]} -eq 0 ] && [ ${PIPESTATUS[1]} -eq 0 ]; then
            echo -e "${GREEN}✅ Successfully restored the pre-restore backup.${NC}"
        else
            echo -e "${RED}❌ Failed to restore the pre-restore backup. Manual intervention required.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No pre-restore backup found to automatically restore.${NC}"
    fi
    
    exit 1
fi