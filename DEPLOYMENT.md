# NoChickenLeftBehind - Digital Ocean Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying NoChickenLeftBehind to Digital Ocean. The application can be deployed using either:

1. **Droplet Deployment** (Recommended) - More control, cost-effective for always-on apps
2. **App Platform** - Managed platform, easier setup, better for variable traffic

## Architecture

```
┌─────────────────┐
│   CloudFlare    │
│      (CDN)      │
└────────┬────────┘
         │
┌────────▼────────┐
│     Nginx       │
│  (Reverse Proxy)│
│   SSL/TLS       │
└────────┬────────┘
         │
┌────────▼────────┐
│   Application   │
│   (Bun/Node)    │
│    Port 3001    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ Redis│  │ PostgreSQL│
│Cache │  │ Database  │
└──────┘  └───────────┘
```

## Prerequisites

1. Digital Ocean account with billing enabled
2. Domain name (for SSL certificates)
3. GitHub repository (for CI/CD)
4. Local development environment with:
   - Docker & Docker Compose
   - Bun runtime
   - Git
   - SSH key pair

## Option 1: Droplet Deployment

### 1.1 Create Droplet

1. Log into Digital Ocean Dashboard
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Regular SSD, 2GB RAM / 1 vCPU ($12/month minimum)
   - **Region**: Choose closest to your users
   - **Additional Options**:
     - Enable Monitoring
     - Enable IPv6
   - **Authentication**: SSH Key (recommended)
   - **Hostname**: `nochicken-prod`

### 1.2 Initial Setup

```bash
# Set environment variables
export DROPLET_IP=your.droplet.ip
export DEPLOY_USER=deploy

# Run initial setup
./scripts/deploy-to-do.sh setup
```

This will:
- Update system packages
- Install Docker & Docker Compose
- Configure firewall (UFW)
- Setup fail2ban for security
- Create application directories

### 1.3 Configure Environment

1. Copy production environment template:
```bash
cp .env.production .env.production.local
```

2. Edit `.env.production.local` with your actual values:
```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For SESSION_SECRET
```

3. Important variables to set:
   - Database credentials
   - API keys (OpenAI, Anthropic, Firebase)
   - Domain name
   - Digital Ocean tokens

### 1.4 Deploy Application

```bash
# Full deployment (first time)
./scripts/deploy-to-do.sh full

# Or step by step:
./scripts/deploy-to-do.sh deploy    # Deploy application
./scripts/deploy-to-do.sh ssl       # Setup SSL certificate
./scripts/deploy-to-do.sh monitoring # Setup monitoring
./scripts/deploy-to-do.sh backup    # Configure backups
```

### 1.5 Setup SSL Certificate

```bash
./scripts/deploy-to-do.sh ssl
```

You'll be prompted for:
- Your domain name
- Email for Let's Encrypt notifications

### 1.6 Configure DNS

Add these DNS records to your domain:

```
Type  Name    Value           TTL
A     @       your.droplet.ip 3600
A     www     your.droplet.ip 3600
```

## Option 2: App Platform Deployment

### 2.1 Prepare Repository

1. Ensure your code is pushed to GitHub
2. Update `do-app-platform.yaml`:
   - Replace `your-github-username` with your GitHub username
   - Update domain name
   - Adjust resource sizes as needed

### 2.2 Deploy via CLI

```bash
# Install doctl
brew install doctl  # macOS
# or
snap install doctl  # Linux

# Authenticate
doctl auth init

# Create app
doctl apps create --spec do-app-platform.yaml
```

### 2.3 Configure via Dashboard

1. Go to Digital Ocean App Platform
2. Connect GitHub repository
3. Set environment variables in dashboard
4. Configure custom domain
5. Enable auto-deploy on push

## Database Management

### Backups

Automatic backups run daily at 2 AM:

```bash
# Manual backup
docker exec nochicken-backup /usr/local/bin/backup-db.sh

# Restore from backup
docker exec nochicken-backup /usr/local/bin/backup-db.sh restore /backups/backup_file.sql.gz
```

### Migrations

```bash
# Run migrations
docker-compose -f docker-compose.production.yml run --rm app bunx prisma migrate deploy

# Generate Prisma client
docker-compose -f docker-compose.production.yml run --rm app bunx prisma generate
```

## Monitoring

### Health Checks

- Application health: `https://yourdomain.com/health`
- Database health: Monitored via Docker healthcheck
- Redis health: Monitored via Docker healthcheck

### Logs

```bash
# View application logs
docker-compose -f docker-compose.production.yml logs -f app

# View all logs
docker-compose -f docker-compose.production.yml logs -f

# Check nginx logs
docker-compose -f docker-compose.production.yml logs -f nginx
```

### Resource Monitoring

```bash
# Check resource usage
docker stats

# System resources
htop

# Disk usage
df -h
ncdu /
```

## CI/CD with GitHub Actions

### Setup Secrets

Add these secrets to your GitHub repository:

1. **Digital Ocean**:
   - `DO_ACCESS_TOKEN`: Your DO API token
   - `DO_REGISTRY_TOKEN`: Container registry token
   - `DO_REGISTRY_NAME`: Registry name
   - `DROPLET_IP`: Your droplet IP
   - `DEPLOY_USER`: SSH user (usually 'deploy')
   - `SSH_PRIVATE_KEY`: Private key for SSH

2. **Application**:
   - `JWT_SECRET`
   - `SESSION_SECRET`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `FIREBASE_API_KEY`
   - All other secrets from `.env.production`

3. **Optional**:
   - `SLACK_WEBHOOK`: For deployment notifications

### Deployment Workflow

Automatic deployment triggers on push to `main`:

```bash
# Manual deployment
gh workflow run deploy.yml

# Deploy to staging
gh workflow run deploy.yml -f environment=staging
```

## Scaling

### Vertical Scaling (Droplet)

1. Create snapshot of current droplet
2. Resize droplet in DO dashboard
3. Restart services

### Horizontal Scaling

1. **Load Balancer**: Add DO Load Balancer
2. **Multiple Droplets**: Clone droplet from snapshot
3. **Database**: Use DO Managed Database
4. **Redis**: Use DO Managed Redis

### Performance Optimization

1. **Enable CDN**:
   ```bash
   # Configure CloudFlare or DO CDN
   # Update CDN_URL in .env.production
   ```

2. **Database Optimization**:
   ```bash
   # Run optimization script
   docker exec nochicken-db psql -U nochicken_user -d nochicken_prod -c "VACUUM ANALYZE;"
   ```

3. **Image Optimization**:
   - Use WebP format
   - Implement lazy loading
   - Compress uploads

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**:
   ```bash
   # Check if app is running
   docker-compose -f docker-compose.production.yml ps
   
   # Restart services
   docker-compose -f docker-compose.production.yml restart
   ```

2. **Database Connection Issues**:
   ```bash
   # Check database logs
   docker-compose -f docker-compose.production.yml logs postgres
   
   # Test connection
   docker exec -it nochicken-db psql -U nochicken_user -d nochicken_prod
   ```

3. **SSL Certificate Issues**:
   ```bash
   # Renew certificate manually
   docker exec nochicken-certbot certbot renew --force-renewal
   ```

4. **Out of Memory**:
   ```bash
   # Check memory usage
   free -h
   
   # Clean Docker resources
   docker system prune -af --volumes
   ```

### Recovery Procedures

1. **Rollback Deployment**:
   ```bash
   # The GitHub Action automatically rolls back on failure
   # Manual rollback:
   docker-compose -f docker-compose.production.yml down
   docker pull registry.digitalocean.com/your-registry/nochicken:previous-tag
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Restore Database**:
   ```bash
   # List available backups
   ls -la /opt/backups/
   
   # Restore specific backup
   ./scripts/backup-db.sh restore /opt/backups/backup_file.sql.gz
   ```

## Security Best Practices

1. **Regular Updates**:
   ```bash
   # Update system packages
   apt update && apt upgrade -y
   
   # Update Docker images
   docker-compose -f docker-compose.production.yml pull
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Security Scanning**:
   ```bash
   # Scan for vulnerabilities
   docker scan nochicken:latest
   ```

3. **Access Control**:
   - Use SSH keys only (no passwords)
   - Implement fail2ban
   - Regular security audits
   - Rotate secrets regularly

4. **Firewall Rules**:
   ```bash
   # Check firewall status
   ufw status verbose
   ```

## Cost Optimization

### Estimated Monthly Costs

- **Droplet**: $12-48/month (2GB-8GB RAM)
- **Managed Database**: $15/month (optional)
- **Spaces (Backup)**: $5/month
- **Load Balancer**: $12/month (if needed)
- **Total**: ~$20-80/month

### Tips

1. Use snapshots for backups instead of Spaces
2. Start with single droplet, scale as needed
3. Use CloudFlare free tier for CDN
4. Monitor usage to right-size resources

## Support

### Documentation

- [Digital Ocean Droplets](https://docs.digitalocean.com/products/droplets/)
- [Docker Documentation](https://docs.docker.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Bun Documentation](https://bun.sh/docs)

### Getting Help

1. Check application logs
2. Review this documentation
3. Check GitHub Issues
4. Contact Digital Ocean support

## Maintenance Schedule

- **Daily**: Automated backups (2 AM)
- **Weekly**: Security updates check
- **Monthly**: SSL certificate renewal (automated)
- **Quarterly**: Full system audit

## Checklist

### Pre-Deployment

- [ ] Domain name configured
- [ ] DNS records added
- [ ] Environment variables set
- [ ] SSH keys configured
- [ ] GitHub secrets added

### Deployment

- [ ] Droplet created
- [ ] Application deployed
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Backups scheduled

### Post-Deployment

- [ ] Health checks passing
- [ ] Logs monitored
- [ ] Performance baseline established
- [ ] Documentation updated
- [ ] Team notified