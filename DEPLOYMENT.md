# Recipe Planner Deployment Guide

This guide covers deploying the Recipe Planner application using Docker containers and Kubernetes.

## Prerequisites

- Docker Desktop or Docker Engine
- Kubernetes cluster (minikube, Docker Desktop K8s, or cloud provider)
- kubectl configured to connect to your cluster
- Git

## Quick Start

### 1. Local Development with Docker Compose

```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Stop services
docker-compose -f docker-compose.production.yml down
```

### 2. Kubernetes Deployment

#### Setup Environment Variables

```bash
# Copy and edit environment file
cp .env.k8s.example .env.k8s
# Edit .env.k8s with your actual values

# Setup secrets in Kubernetes
./scripts/setup-k8s-secrets.sh
```

#### Deploy to Kubernetes

```bash
# Deploy everything
./k8s/deploy.sh

# Or deploy manually
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/app.yaml
```

#### Check Deployment Status

```bash
# Check pods
kubectl get pods -n recipe-planner

# Check services
kubectl get services -n recipe-planner

# Check ingress
kubectl get ingress -n recipe-planner

# View logs
kubectl logs -f -l app=recipe-planner-app -n recipe-planner
```

## Architecture

### Components

- **Frontend**: React with TypeScript and Chakra UI
- **Backend**: Bun runtime with Hono framework
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Firebase Auth
- **Reverse Proxy**: Traefik (Docker Compose) or nginx-ingress (Kubernetes)

### Docker Images

The application uses multi-stage, multi-platform Docker builds supporting:
- linux/amd64 (x86_64)
- linux/arm64 (ARM processors like Apple Silicon)

## Configuration

### Environment Variables

#### Required Variables

- `POSTGRES_PASSWORD`: Database password
- `FIREBASE_API_KEY`: Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `JWT_SECRET`: JWT signing secret (32+ characters)
- `ENCRYPTION_KEY`: Data encryption key (32 characters)

#### Optional Variables

- `DOMAIN_NAME`: Your domain name for ingress
- `DOCKER_REGISTRY`: Custom Docker registry
- `IMAGE_TAG`: Docker image tag (default: latest)

### Kubernetes Resources

- **Namespace**: `recipe-planner`
- **ConfigMap**: Non-sensitive configuration
- **Secret**: Sensitive data (passwords, API keys)
- **PVC**: PostgreSQL data storage (10Gi)
- **Deployments**: PostgreSQL and Application
- **Services**: Internal networking
- **Ingress**: External access with SSL

## CI/CD Pipeline

The GitHub Actions workflow automatically:

1. **Build**: Creates multi-platform Docker images
2. **Test**: Runs any configured tests
3. **Push**: Uploads images to GitHub Container Registry
4. **Deploy**: Updates Kubernetes deployment (main branch only)

### Setup GitHub Actions

1. Add these secrets to your GitHub repository:
   - `KUBECONFIG`: Base64 encoded kubeconfig file
   - Environment variables from `.env.k8s.example`

2. Push to main branch to trigger deployment

## Security

### Best Practices Implemented

- Non-root container user (UID 1001)
- Read-only root filesystem where possible
- Security contexts with dropped capabilities
- Resource limits and requests
- Health checks and liveness probes
- Secret management with Kubernetes secrets
- HTTPS/TLS termination at ingress

### SSL/TLS Certificates

The ingress is configured for cert-manager with Let's Encrypt:

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Monitoring and Logging

### View Application Logs

```bash
# Application logs
kubectl logs -f deployment/recipe-planner-app -n recipe-planner

# Database logs
kubectl logs -f deployment/postgres -n recipe-planner

# All pods in namespace
kubectl logs -f -l app=recipe-planner-app -n recipe-planner
```

### Health Checks

The application exposes health endpoints:
- `/health`: Application health check
- Database connectivity is verified via PostgreSQL probes

## Scaling

### Horizontal Scaling

```bash
# Scale application pods
kubectl scale deployment recipe-planner-app --replicas=3 -n recipe-planner

# Auto-scaling based on CPU usage
kubectl autoscale deployment recipe-planner-app --cpu-percent=70 --min=2 --max=10 -n recipe-planner
```

### Vertical Scaling

Edit resource requests/limits in `k8s/app.yaml`:

```yaml
resources:
  requests:
    cpu: 200m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
kubectl exec -it deployment/postgres -n recipe-planner -- pg_dump -U recipe_user recipe_planner > backup.sql

# Restore backup
kubectl exec -i deployment/postgres -n recipe-planner -- psql -U recipe_user recipe_planner < backup.sql
```

### Persistent Volume Backup

Follow your cloud provider's documentation for PV snapshots and backups.

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check logs and resource availability
   ```bash
   kubectl describe pod <pod-name> -n recipe-planner
   ```

2. **Database connection issues**: Verify secrets and network policies
   ```bash
   kubectl get secrets -n recipe-planner
   kubectl exec -it deployment/recipe-planner-app -n recipe-planner -- env | grep POSTGRES
   ```

3. **Ingress not working**: Check ingress controller and DNS configuration
   ```bash
   kubectl get ingress -n recipe-planner
   kubectl describe ingress recipe-planner-ingress -n recipe-planner
   ```

### Cleanup

To completely remove the deployment:

```bash
./k8s/teardown.sh
```

## Support

For issues and questions:
- Check the application logs first
- Review Kubernetes events: `kubectl get events -n recipe-planner`
- Consult the troubleshooting section above