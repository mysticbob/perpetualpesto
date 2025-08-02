# Complete Cloud Run Deployment Guide

## 📋 Required Data (Already Extracted from Your Project)

### 🔥 Firebase Configuration (FOUND)
```bash
FIREBASE_API_KEY="AIzaSyCLl1NM4I__L24QtFaBX-v52HBUDmAUXng"
FIREBASE_AUTH_DOMAIN="ovie-online.firebaseapp.com"
FIREBASE_PROJECT_ID="ovie-online"
```

### 🔐 Security Keys (GENERATE NEW)
```bash
# Generate these fresh for production:
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

echo "JWT_SECRET=$JWT_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
```

### ☁️ Google Cloud Project
```bash
# Your current project (update if different):
GOOGLE_CLOUD_PROJECT="nochickenleftbehind"
REGION="us-central1"
```

## 🚀 Quick Deployment (5 Commands)

### 1. Install Google Cloud CLI (if needed)
```bash
# macOS
brew install --cask google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 2. Authenticate and Set Project
```bash
gcloud auth login
gcloud config set project nochickenleftbehind
```

### 3. Create Environment File
```bash
# Copy template
cp .env.cloudrun.example .env.cloudrun

# Generate security keys
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.cloudrun
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)" >> .env.cloudrun

# Add your Firebase config
cat >> .env.cloudrun << 'EOF'
FIREBASE_API_KEY="AIzaSyCLl1NM4I__L24QtFaBX-v52HBUDmAUXng"
FIREBASE_AUTH_DOMAIN="ovie-online.firebaseapp.com"
FIREBASE_PROJECT_ID="ovie-online"
GOOGLE_CLOUD_PROJECT="nochickenleftbehind"
REGION="us-central1"
EOF
```

### 4. Set Up Database and Secrets
```bash
# This creates Cloud SQL and uploads all secrets
./setup-cloudsql.sh
./setup-gcp-secrets.sh
```

### 5. Deploy Application
```bash
# This deploys your app to Cloud Run
./deploy-cloudrun.sh
```

## 🔧 Alternative: Manual Step-by-Step

### Step 1: Enable Required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Step 2: Create Cloud SQL Database
```bash
# Create database instance
gcloud sql instances create recipe-planner-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database and user
gcloud sql databases create recipe_planner --instance=recipe-planner-db
gcloud sql users create recipe_user --instance=recipe-planner-db --password=YOUR_PASSWORD

# Get connection string
DATABASE_URL="postgresql://recipe_user:YOUR_PASSWORD@INSTANCE_IP:5432/recipe_planner"
```

### Step 3: Create Secrets
```bash
# Create all required secrets
echo "YOUR_DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=-
echo "AIzaSyCLl1NM4I__L24QtFaBX-v52HBUDmAUXng" | gcloud secrets create FIREBASE_API_KEY --data-file=-
echo "ovie-online.firebaseapp.com" | gcloud secrets create FIREBASE_AUTH_DOMAIN --data-file=-
echo "ovie-online" | gcloud secrets create FIREBASE_PROJECT_ID --data-file=-
echo "$(openssl rand -base64 32)" | gcloud secrets create JWT_SECRET --data-file=-
echo "$(openssl rand -hex 16)" | gcloud secrets create ENCRYPTION_KEY --data-file=-
```

### Step 4: Deploy to Cloud Run
```bash
gcloud run deploy recipe-planner \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,FIREBASE_API_KEY=FIREBASE_API_KEY:latest,FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,JWT_SECRET=JWT_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest"
```

## 🐛 Troubleshooting

### Check Deployment Status
```bash
# View logs
./debug-cloudrun.sh

# Check configuration
./check-cloudrun-config.sh

# View service details
gcloud run services describe recipe-planner --region us-central1
```

### Common Issues

1. **Service won't start**: Usually missing DATABASE_URL secret
2. **Database connection fails**: Check Cloud SQL instance is running
3. **Authentication errors**: Verify Firebase config is correct
4. **Port issues**: Should be automatically handled (PORT=8080)

### Fix Missing Secrets
```bash
# Update service with all secrets
gcloud run services update recipe-planner \
  --region us-central1 \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,FIREBASE_API_KEY=FIREBASE_API_KEY:latest,FIREBASE_AUTH_DOMAIN=FIREBASE_AUTH_DOMAIN:latest,FIREBASE_PROJECT_ID=FIREBASE_PROJECT_ID:latest,JWT_SECRET=JWT_SECRET:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest"
```

## ✅ Success Checklist

- [ ] Google Cloud CLI installed and authenticated
- [ ] Project set to `nochickenleftbehind`
- [ ] `.env.cloudrun` file created with all values
- [ ] Cloud SQL database created and running
- [ ] All secrets uploaded to Secret Manager
- [ ] Cloud Run service deployed successfully
- [ ] Service URL accessible (will be shown after deployment)

## 🌐 Your App URL

After successful deployment, your app will be available at:
```
https://recipe-planner-RANDOM-HASH-uc.a.run.app
```

The exact URL will be displayed after running `./deploy-cloudrun.sh`.