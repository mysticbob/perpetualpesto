#!/bin/bash

# NoChickenLeftBehind - Digital Ocean Deployment Script
# This script handles the complete deployment process to a Digital Ocean droplet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DROPLET_IP="${DROPLET_IP}"
APP_DIR="/opt/nochicken"
BACKUP_DIR="/opt/backups"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check for required tools
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log_error "Docker Compose is required but not installed."; exit 1; }
    command -v ssh >/dev/null 2>&1 || { log_error "SSH is required but not installed."; exit 1; }
    command -v rsync >/dev/null 2>&1 || { log_error "rsync is required but not installed."; exit 1; }
    
    # Check for environment file
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Please create .env.production from .env.example"
        exit 1
    fi
    
    # Check for droplet IP
    if [ -z "$DROPLET_IP" ]; then
        log_error "DROPLET_IP environment variable is not set"
        echo "Usage: DROPLET_IP=your.droplet.ip $0"
        exit 1
    fi
    
    log_info "All requirements met!"
}

setup_droplet() {
    log_info "Setting up Digital Ocean droplet..."
    
    ssh ${DEPLOY_USER}@${DROPLET_IP} << 'ENDSSH'
    set -e
    
    # Update system
    sudo apt-get update
    sudo apt-get upgrade -y
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    # Install additional tools
    sudo apt-get install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        postgresql-client \
        htop \
        ncdu \
        fail2ban \
        ufw
    
    # Setup firewall
    sudo ufw --force enable
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Create application directories
    sudo mkdir -p /opt/nochicken/{uploads,logs,backups,certbot}
    sudo mkdir -p /opt/backups
    sudo chown -R $USER:$USER /opt/nochicken /opt/backups
    
    # Setup fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    # Setup log rotation
    sudo tee /etc/logrotate.d/nochicken > /dev/null << 'EOF'
/opt/nochicken/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        docker exec nochicken-app kill -USR1 1
    endscript
}
EOF
    
    echo "Droplet setup completed!"
ENDSSH
    
    log_info "Droplet setup completed!"
}

deploy_application() {
    log_info "Deploying application to ${DROPLET_IP}..."
    
    # Build production image locally
    log_info "Building production Docker image..."
    cd "$PROJECT_ROOT"
    docker build -f Dockerfile.production -t nochicken:latest .
    
    # Save and transfer image
    log_info "Saving Docker image..."
    docker save nochicken:latest | gzip > /tmp/nochicken-latest.tar.gz
    
    log_info "Transferring files to droplet..."
    # Transfer necessary files
    rsync -avz --progress \
        -e "ssh -o StrictHostKeyChecking=no" \
        "$PROJECT_ROOT/docker-compose.production.yml" \
        "$PROJECT_ROOT/nginx.conf" \
        "$PROJECT_ROOT/.env.production" \
        "$PROJECT_ROOT/scripts/" \
        "$PROJECT_ROOT/prisma/" \
        "${DEPLOY_USER}@${DROPLET_IP}:${APP_DIR}/"
    
    # Transfer Docker image
    log_info "Transferring Docker image (this may take a while)..."
    scp /tmp/nochicken-latest.tar.gz "${DEPLOY_USER}@${DROPLET_IP}:/tmp/"
    rm /tmp/nochicken-latest.tar.gz
    
    # Load image and start services on droplet
    ssh ${DEPLOY_USER}@${DROPLET_IP} << ENDSSH
    set -e
    cd ${APP_DIR}
    
    # Load Docker image
    echo "Loading Docker image..."
    gunzip -c /tmp/nochicken-latest.tar.gz | docker load
    rm /tmp/nochicken-latest.tar.gz
    
    # Copy environment file
    cp .env.production .env
    
    # Stop existing services
    docker-compose -f docker-compose.production.yml down || true
    
    # Run database migrations
    echo "Running database migrations..."
    docker-compose -f docker-compose.production.yml up -d postgres
    sleep 10
    docker-compose -f docker-compose.production.yml run --rm app bunx prisma migrate deploy
    
    # Start all services
    echo "Starting services..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be healthy
    echo "Waiting for services to be healthy..."
    sleep 20
    
    # Check service status
    docker-compose -f docker-compose.production.yml ps
    
    # Cleanup old images
    docker image prune -af --filter "until=24h"
    
    echo "Deployment completed!"
ENDSSH
    
    log_info "Application deployed successfully!"
}

setup_ssl() {
    log_info "Setting up SSL certificate..."
    
    read -p "Enter your domain name (e.g., nochicken.yourdomain.com): " DOMAIN
    read -p "Enter your email for Let's Encrypt notifications: " EMAIL
    
    ssh ${DEPLOY_USER}@${DROPLET_IP} << ENDSSH
    set -e
    
    # Update nginx configuration with actual domain
    sudo sed -i "s/nochicken.yourdomain.com/${DOMAIN}/g" ${APP_DIR}/nginx.conf
    
    # Copy nginx configuration
    sudo cp ${APP_DIR}/nginx.conf /etc/nginx/nginx.conf
    
    # Test nginx configuration
    sudo nginx -t
    
    # Reload nginx
    sudo systemctl reload nginx
    
    # Get SSL certificate
    sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${EMAIL}
    
    # Setup auto-renewal
    echo "0 0 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
    
    echo "SSL setup completed!"
ENDSSH
    
    log_info "SSL certificate installed for ${DOMAIN}"
}

setup_monitoring() {
    log_info "Setting up monitoring..."
    
    ssh ${DEPLOY_USER}@${DROPLET_IP} << 'ENDSSH'
    set -e
    cd ${APP_DIR}
    
    # Create monitoring script
    cat > /opt/nochicken/monitor.sh << 'EOF'
#!/bin/bash

# Health check
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)

if [ "$HEALTH_CHECK" != "200" ]; then
    echo "Health check failed with status: $HEALTH_CHECK"
    # Restart services
    cd /opt/nochicken
    docker-compose -f docker-compose.production.yml restart app
    
    # Send alert (configure your alerting here)
    # curl -X POST your-alerting-webhook
fi

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print int($5)}')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
    # Clean up Docker
    docker system prune -af --volumes
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "Memory usage is high: ${MEMORY_USAGE}%"
fi
EOF
    
    chmod +x /opt/nochicken/monitor.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/nochicken/monitor.sh >> /opt/nochicken/logs/monitor.log 2>&1") | crontab -
    
    echo "Monitoring setup completed!"
ENDSSH
    
    log_info "Monitoring configured!"
}

backup_database() {
    log_info "Setting up database backups..."
    
    ssh ${DEPLOY_USER}@${DROPLET_IP} << 'ENDSSH'
    set -e
    
    # Ensure backup script is executable
    chmod +x ${APP_DIR}/scripts/backup-db.sh
    
    # Run initial backup
    ${APP_DIR}/scripts/backup-db.sh
    
    # Setup daily backups via cron
    (crontab -l 2>/dev/null; echo "0 2 * * * ${APP_DIR}/scripts/backup-db.sh >> ${APP_DIR}/logs/backup.log 2>&1") | crontab -
    
    echo "Backup configuration completed!"
ENDSSH
    
    log_info "Database backup configured!"
}

health_check() {
    log_info "Running health check..."
    
    # Check if application is responding
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${DROPLET_IP}/health" || echo "000")
    
    if [ "$HEALTH_STATUS" = "200" ]; then
        log_info "Application is healthy!"
    else
        log_error "Health check failed with status: $HEALTH_STATUS"
        
        # Show container logs
        ssh ${DEPLOY_USER}@${DROPLET_IP} "cd ${APP_DIR} && docker-compose -f docker-compose.production.yml logs --tail=50 app"
        exit 1
    fi
}

show_status() {
    log_info "Showing deployment status..."
    
    ssh ${DEPLOY_USER}@${DROPLET_IP} << ENDSSH
    echo "=== Docker Containers ==="
    docker-compose -f ${APP_DIR}/docker-compose.production.yml ps
    
    echo -e "\n=== System Resources ==="
    df -h /
    free -h
    
    echo -e "\n=== Recent Logs ==="
    docker-compose -f ${APP_DIR}/docker-compose.production.yml logs --tail=20 app
ENDSSH
}

# Main execution
main() {
    echo "NoChickenLeftBehind - Digital Ocean Deployment"
    echo "=============================================="
    
    case "${1:-deploy}" in
        setup)
            check_requirements
            setup_droplet
            ;;
        deploy)
            check_requirements
            deploy_application
            health_check
            ;;
        ssl)
            setup_ssl
            ;;
        monitoring)
            setup_monitoring
            ;;
        backup)
            backup_database
            ;;
        status)
            show_status
            ;;
        full)
            check_requirements
            setup_droplet
            deploy_application
            setup_ssl
            setup_monitoring
            backup_database
            health_check
            show_status
            ;;
        *)
            echo "Usage: $0 {setup|deploy|ssl|monitoring|backup|status|full}"
            echo ""
            echo "Commands:"
            echo "  setup      - Initial droplet setup"
            echo "  deploy     - Deploy application"
            echo "  ssl        - Setup SSL certificate"
            echo "  monitoring - Setup monitoring"
            echo "  backup     - Setup database backups"
            echo "  status     - Show deployment status"
            echo "  full       - Run all steps"
            echo ""
            echo "Environment variables:"
            echo "  DROPLET_IP  - IP address of your Digital Ocean droplet (required)"
            echo "  DEPLOY_USER - SSH user for deployment (default: deploy)"
            exit 1
            ;;
    esac
    
    log_info "Operation completed successfully!"
}

# Run main function
main "$@"