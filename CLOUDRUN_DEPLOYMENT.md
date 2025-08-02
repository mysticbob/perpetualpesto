# Recipe Planner - Google Cloud Run Deployment Guide

Deploy your Recipe Planner application to Google Cloud Run with a single command: `gcloud run deploy`

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install)
- Google Cloud Project with billing enabled
- Docker installed (for local builds)

## Quick Start

### 1. Initial Setup

```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Clone and navigate to the project
git clone <your-repo>
cd nochickenleftbehind
```

### 2. One-Command Deployment

```bash
# Deploy everything with one script
./deploy-cloudrun.sh
```

Or manually:

```bash
# Build and deploy
gcloud run deploy recipe-planner \
    --source . \
    --region us-central1 \
    --allow-unauthenticated
```

## Detailed Setup

### Step 1: Database Setup

```bash
# Set up Cloud SQL PostgreSQL instance
./setup-cloudsql.sh
```

This creates:
- Cloud SQL PostgreSQL instance (`recipe-planner-db`)
- Database (`recipe_planner`) 
- User (`recipe_user`)
- Generates secure password
- Creates/updates `DATABASE_URL` secret

### Step 2: Configure Secrets

```bash
# Copy environment template
cp .env.cloudrun.example .env.cloudrun

# Edit with your values
nano .env.cloudrun

# Create all secrets in Google Cloud
./setup-gcp-secrets.sh
```

Required secrets:
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_API_KEY` - Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain  
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `JWT_SECRET` - JWT signing secret (32+ chars)
- `ENCRYPTION_KEY` - Encryption key (32 chars)

### Step 3: Deploy Application

```bash
# Deploy to Cloud Run
./deploy-cloudrun.sh
```

## Manual Deployment Commands

### Build and Deploy from Source

```bash
gcloud run deploy recipe-planner \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "NODE_ENV=production" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,FIREBASE_API_KEY=FIREBASE_API_KEY:latest,FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,JWT_SECRET=JWT_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest"
```

### Build and Deploy from Container

```bash
# Build container
docker build -f Dockerfile.production -t gcr.io/YOUR_PROJECT_ID/recipe-planner .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/recipe-planner

# Deploy container
gcloud run deploy recipe-planner \
    --image gcr.io/YOUR_PROJECT_ID/recipe-planner \
    --region us-central1 \
    --allow-unauthenticated
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Runtime environment | Yes (auto-set to "production") |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `FIREBASE_API_KEY` | Firebase API key | Yes |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `ENCRYPTION_KEY` | Data encryption key | Yes |

### Cloud Run Configuration

- **Platform**: Managed
- **Region**: us-central1 (configurable)
- **Memory**: 1Gi
- **CPU**: 1 vCPU
- **Port**: 3000
- **Concurrency**: 80 (default)
- **Min instances**: 0 (scales to zero)
- **Max instances**: 10
- **Request timeout**: 300s (default)

## Scaling and Performance

### Auto-scaling

Cloud Run automatically scales based on request traffic:
- Scales to zero when no requests
- Scales up to handle traffic spikes
- Each instance can handle up to 80 concurrent requests

### Manual Scaling Configuration

```bash
# Set scaling limits
gcloud run services update recipe-planner \
    --region us-central1 \
    --min-instances 1 \
    --max-instances 20 \
    --concurrency 100
```

### Performance Tuning

```bash
# Increase resources for high traffic
gcloud run services update recipe-planner \
    --region us-central1 \
    --memory 2Gi \
    --cpu 2
```

## Custom Domain

### Map Custom Domain

```bash
# Map domain (requires domain verification)
gcloud run domain-mappings create \
    --service recipe-planner \
    --domain your-domain.com \
    --region us-central1
```

### SSL Certificates

Cloud Run automatically provisions SSL certificates for custom domains.

## Monitoring and Logging

### View Logs

```bash
# Tail logs in real-time
gcloud run logs tail --service recipe-planner --region us-central1

# View recent logs
gcloud run logs read --service recipe-planner --region us-central1 --limit 100
```

### Monitoring

Access Cloud Run monitoring in the Google Cloud Console:
- Request metrics
- Error rates  
- Cold start times
- Resource utilization

## CI/CD with GitHub Actions

The included workflow automatically deploys on push to main branch.

### Setup GitHub Secrets

Add these secrets to your GitHub repository:

1. `GOOGLE_CLOUD_PROJECT` - Your project ID
2. `GOOGLE_CREDENTIALS` - Service account JSON key

### Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --display-name "GitHub Actions"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Download service account key
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Cost Optimization

### Free Tier

Cloud Run includes generous free tier:
- 2 million requests per month
- 400,000 GB-seconds per month
- 200,000 vCPU-seconds per month

### Cost Control

```bash
# Set max instances to control costs
gcloud run services update recipe-planner \
    --region us-central1 \
    --max-instances 5

# Use smaller resource allocation for low-traffic apps
gcloud run services update recipe-planner \
    --region us-central1 \
    --memory 512Mi \
    --cpu 0.5
```

## Security

### IAM and Authentication

- Service runs with minimal permissions
- Secrets stored in Google Secret Manager
- HTTPS enforced automatically
- Container runs as non-root user

### Network Security

```bash
# Restrict ingress to authenticated users only
gcloud run services update recipe-planner \
    --region us-central1 \
    --no-allow-unauthenticated
```

## Troubleshooting

### Common Issues

1. **Cold starts**: First request after idle period may be slow
   - Solution: Set `--min-instances 1` for critical apps

2. **Memory issues**: App crashes with out-of-memory errors
   - Solution: Increase `--memory` allocation

3. **Timeout errors**: Requests taking too long
   - Solution: Optimize database queries and increase `--timeout`

### Debug Commands

```bash
# Check service status
gcloud run services describe recipe-planner --region us-central1

# View service configuration
gcloud run services describe recipe-planner --region us-central1 --format export

# Test connectivity
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
    https://your-service-url.run.app/health
```

### Rollback

```bash
# List revisions
gcloud run revisions list --service recipe-planner --region us-central1

# Rollback to previous revision
gcloud run services update-traffic recipe-planner \
    --to-revisions REVISION_NAME=100 \
    --region us-central1
```

## Cleanup

```bash
# Delete Cloud Run service
gcloud run services delete recipe-planner --region us-central1

# Delete Cloud SQL instance
gcloud sql instances delete recipe-planner-db

# Delete secrets
gcloud secrets delete DATABASE_URL
gcloud secrets delete FIREBASE_API_KEY
# ... (delete other secrets)
```

## Next Steps

1. **Set up monitoring alerts** in Cloud Console
2. **Configure Cloud CDN** for static assets
3. **Set up backup strategy** for Cloud SQL
4. **Implement health checks** for better reliability
5. **Consider Cloud Armor** for DDoS protection

## Support

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)