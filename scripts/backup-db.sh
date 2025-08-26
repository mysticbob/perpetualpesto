#!/bin/bash

# NoChickenLeftBehind - Database Backup Script
# Performs automated PostgreSQL backups with rotation and optional S3/Spaces upload

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-nochicken_prod}"
POSTGRES_USER="${POSTGRES_USER:-nochicken_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# Digital Ocean Spaces configuration (optional)
DO_SPACES_KEY="${DO_SPACES_KEY}"
DO_SPACES_SECRET="${DO_SPACES_SECRET}"
DO_SPACES_BUCKET="${DO_SPACES_BUCKET}"
DO_SPACES_REGION="${DO_SPACES_REGION:-nyc3}"
DO_SPACES_ENDPOINT="https://${DO_SPACES_REGION}.digitaloceanspaces.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} INFO: $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} WARN: $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ERROR: $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to perform backup
perform_backup() {
    log_info "Starting database backup for ${POSTGRES_DB}..."
    
    # Set PGPASSWORD for authentication
    export PGPASSWORD="${POSTGRES_PASSWORD}"
    
    # Perform the backup
    if pg_dump \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --no-password \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --format=plain \
        --encoding=UTF8 | gzip -9 > "${BACKUP_DIR}/${BACKUP_FILE}"; then
        
        log_info "Backup completed successfully: ${BACKUP_FILE}"
        
        # Get backup size
        BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
        log_info "Backup size: ${BACKUP_SIZE}"
        
        return 0
    else
        log_error "Backup failed!"
        return 1
    fi
}

# Function to upload to Digital Ocean Spaces
upload_to_spaces() {
    if [ -z "$DO_SPACES_KEY" ] || [ -z "$DO_SPACES_SECRET" ] || [ -z "$DO_SPACES_BUCKET" ]; then
        log_warn "Digital Ocean Spaces credentials not configured. Skipping cloud upload."
        return 0
    fi
    
    log_info "Uploading backup to Digital Ocean Spaces..."
    
    # Configure AWS CLI for Spaces
    aws configure set aws_access_key_id "${DO_SPACES_KEY}" --profile spaces
    aws configure set aws_secret_access_key "${DO_SPACES_SECRET}" --profile spaces
    aws configure set region "${DO_SPACES_REGION}" --profile spaces
    
    # Upload to Spaces
    if aws s3 cp \
        "${BACKUP_DIR}/${BACKUP_FILE}" \
        "s3://${DO_SPACES_BUCKET}/database-backups/${BACKUP_FILE}" \
        --endpoint-url "${DO_SPACES_ENDPOINT}" \
        --profile spaces \
        --storage-class STANDARD; then
        
        log_info "Backup uploaded to Spaces successfully"
        
        # Set lifecycle policy for automatic deletion after 30 days
        aws s3api put-object-tagging \
            --bucket "${DO_SPACES_BUCKET}" \
            --key "database-backups/${BACKUP_FILE}" \
            --tagging 'TagSet=[{Key=AutoDelete,Value=30days}]' \
            --endpoint-url "${DO_SPACES_ENDPOINT}" \
            --profile spaces 2>/dev/null || true
        
        return 0
    else
        log_error "Failed to upload backup to Spaces"
        return 1
    fi
}

# Function to rotate old backups
rotate_backups() {
    log_info "Rotating old backups (keeping last ${RETENTION_DAYS} days)..."
    
    # Remove old local backups
    find "${BACKUP_DIR}" \
        -name "backup_${POSTGRES_DB}_*.sql.gz" \
        -type f \
        -mtime +${RETENTION_DAYS} \
        -exec rm -f {} \; \
        -exec echo "Deleted old backup: {}" \;
    
    # Clean up old backups in Spaces
    if [ -n "$DO_SPACES_KEY" ] && [ -n "$DO_SPACES_SECRET" ] && [ -n "$DO_SPACES_BUCKET" ]; then
        log_info "Cleaning old backups from Spaces..."
        
        # List and delete old backups
        CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d)
        
        aws s3 ls "s3://${DO_SPACES_BUCKET}/database-backups/" \
            --endpoint-url "${DO_SPACES_ENDPOINT}" \
            --profile spaces | \
        while read -r line; do
            FILE_DATE=$(echo "$line" | awk '{print $1}')
            FILE_NAME=$(echo "$line" | awk '{print $4}')
            
            if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]] && [[ "$FILE_NAME" == backup_${POSTGRES_DB}_* ]]; then
                log_info "Deleting old Spaces backup: $FILE_NAME"
                aws s3 rm "s3://${DO_SPACES_BUCKET}/database-backups/${FILE_NAME}" \
                    --endpoint-url "${DO_SPACES_ENDPOINT}" \
                    --profile spaces
            fi
        done 2>/dev/null || true
    fi
}

# Function to verify backup
verify_backup() {
    log_info "Verifying backup integrity..."
    
    # Test if the backup file can be decompressed
    if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}" 2>/dev/null; then
        log_info "Backup verification passed"
        return 0
    else
        log_error "Backup verification failed!"
        return 1
    fi
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Add your notification logic here (Slack, email, etc.)
    # Example for Slack webhook:
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Database Backup ${status}: ${message}\"}" \
            2>/dev/null || true
    fi
}

# Function to create backup report
create_report() {
    local report_file="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
Database Backup Report
======================
Date: $(date)
Database: ${POSTGRES_DB}
Host: ${POSTGRES_HOST}
Backup File: ${BACKUP_FILE}
Backup Size: ${BACKUP_SIZE}
Retention: ${RETENTION_DAYS} days
Spaces Upload: ${DO_SPACES_BUCKET:-Not configured}

Current Backups:
$(ls -lh "${BACKUP_DIR}"/backup_${POSTGRES_DB}_*.sql.gz 2>/dev/null | tail -10)

Disk Usage:
$(df -h "${BACKUP_DIR}")
EOF
    
    log_info "Backup report created: ${report_file}"
}

# Function to restore from backup (for testing)
restore_backup() {
    local restore_file=$1
    
    if [ -z "$restore_file" ]; then
        log_error "No backup file specified for restore"
        return 1
    fi
    
    if [ ! -f "$restore_file" ]; then
        log_error "Backup file not found: $restore_file"
        return 1
    fi
    
    log_warn "WARNING: This will restore the database from backup. All current data will be lost!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        return 0
    fi
    
    log_info "Restoring database from ${restore_file}..."
    
    export PGPASSWORD="${POSTGRES_PASSWORD}"
    
    if gunzip -c "$restore_file" | psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --no-password; then
        
        log_info "Database restored successfully"
        return 0
    else
        log_error "Database restore failed!"
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting NoChickenLeftBehind database backup process..."
    
    # Check if this is a restore operation
    if [ "$1" = "restore" ]; then
        restore_backup "$2"
        exit $?
    fi
    
    # Perform backup
    if perform_backup; then
        # Verify backup
        if verify_backup; then
            # Upload to Spaces
            upload_to_spaces
            
            # Rotate old backups
            rotate_backups
            
            # Create report
            create_report
            
            # Send success notification
            send_notification "SUCCESS" "Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"
            
            log_info "Backup process completed successfully!"
            exit 0
        else
            # Send failure notification
            send_notification "FAILED" "Backup verification failed for ${BACKUP_FILE}"
            
            # Remove corrupted backup
            rm -f "${BACKUP_DIR}/${BACKUP_FILE}"
            
            log_error "Backup process failed!"
            exit 1
        fi
    else
        # Send failure notification
        send_notification "FAILED" "Backup creation failed for ${POSTGRES_DB}"
        
        log_error "Backup process failed!"
        exit 1
    fi
}

# Run main function
main "$@"